'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { FileUpload } from '@/components/FileUpload';
import { JobStatusCard } from '@/components/JobStatusCard';
import { QuestionPaperGenerator } from '@/components/QuestionPaperGenerator';
import { QuestionBank } from '@/components/QuestionBank';
import { Upload, FileText, BookOpen, Users, Brain, Sparkles, CheckCircle, Clock, Loader2, LogOut, Settings } from 'lucide-react';
import { toast } from 'sonner';

type Course = {
  id: string;
  courseCode: string;
  courseName: string;
  courseCoordinatorId: string;
  moduleCoordinatorId: string;
  programCoordinatorId: string;
  courseCoordinator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  moduleCoordinator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  programCoordinator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count?: {
    materials: number;
    questions: number;
  };
};

export default function CourseCoordinatorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // AI Generation state
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<number>(1);
  const [generationConfig, setGenerationConfig] = useState({
    questionTypes: ['STRAIGHTFORWARD', 'PROBLEM_BASED'],
    difficultyLevels: ['EASY', 'MEDIUM'],
    bloomLevels: {
      REMEMBER: 2,
      UNDERSTAND: 3,
      APPLY: 2,
      ANALYZE: 1,
      EVALUATE: 1,
      CREATE: 1
    }
  });
  const [activeJobs, setActiveJobs] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Question Bank state
  const [selectedQuestionCourse, setSelectedQuestionCourse] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [questionsPerPage] = useState<number>(20);

  // tRPC hooks
  const { data: debugData } = trpc.course.debugSession.useQuery();
  const { data: courses, isLoading: coursesLoading } = trpc.course.getMyCourses.useQuery();

  // Debug logging
  console.log('Debug data:', debugData);
  console.log('Courses data:', courses);
  console.log('Session:', session);

  const { data: materials } = trpc.material.getMaterialsByCourse.useQuery(
    { courseId: selectedCourse },
    { enabled: !!selectedCourse }
  );
  const uploadMaterialMutation = trpc.material.uploadMaterialWithFile.useMutation();
  const startQuestionGenerationMutation = trpc.questionJob.startQuestionGeneration.useMutation();
  const { data: courseJobs } = trpc.questionJob.getCourseJobs.useQuery(
    { courseId: selectedCourse },
    { enabled: !!selectedCourse }
  );

  // Question Bank tRPC hooks
  const { data: questionData, isLoading: questionsLoading, refetch: refetchQuestions } = trpc.question.getCourseQuestions.useQuery(
    {
      courseId: selectedQuestionCourse,
      page: currentPage,
      limit: questionsPerPage
    },
    { enabled: !!selectedQuestionCourse }
  );
  const updateQuestionMutation = trpc.question.updateQuestion.useMutation();
  const approveQuestionMutation = trpc.question.approveQuestion.useMutation();
  const rejectQuestionMutation = trpc.question.rejectQuestion.useMutation();
  const submitQuestionsMutation = trpc.question.submitQuestionsForReview.useMutation();
  const deleteQuestionMutation = trpc.question.deleteQuestion.useMutation();
  const deleteMultipleQuestionsMutation = trpc.question.deleteMultipleQuestions.useMutation();

  // File upload handler
  const handleFileUpload = async (courseId: string, materialType: 'SYLLABUS' | 'UNIT_MATERIAL', unit?: number) => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Convert file to base64
      const fileBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:application/pdf;base64, prefix
        };
        reader.readAsDataURL(selectedFile);
      });

      setUploadProgress(50);

      // Upload file to Supabase and create material record
      await uploadMaterialMutation.mutateAsync({
        courseId,
        title: selectedFile.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        unit: materialType === 'UNIT_MATERIAL' ? unit : undefined,
        materialType,
        fileBase64,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
      });

      setUploadProgress(100);
      toast.success('File uploaded successfully!');
      setSelectedFile(null);
    } catch (error) {
      toast.error('Failed to upload file');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // AI Question Generation handler
  const handleStartQuestionGeneration = async () => {
    if (!selectedCourse || !selectedMaterial) {
      toast.error('Please select a course and material');
      return;
    }

    try {
      const result = await startQuestionGenerationMutation.mutateAsync({
        courseId: selectedCourse,
        materialId: selectedMaterial,
        unit: selectedUnit,
        questionsPerBloomLevel: generationConfig.bloomLevels,
        questionTypes: generationConfig.questionTypes as Array<'STRAIGHTFORWARD' | 'PROBLEM_BASED' | 'SCENARIO_BASED'>,
        difficultyLevels: generationConfig.difficultyLevels as Array<'EASY' | 'MEDIUM' | 'HARD'>,
        marks: ['TWO_MARKS', 'EIGHT_MARKS', 'SIXTEEN_MARKS']
      });

      setActiveJobs(prev => [...prev, result.jobId]);
      toast.success('Question generation started! You can monitor the progress below.');

      // Reset form
      setSelectedCourse('');
      setSelectedMaterial('');
      setSelectedUnit(1);
    } catch (error) {
      toast.error('Failed to start question generation');
      console.error('Generation error:', error);
    }
  };

  // Question Paper Generation handler
  const handleGenerateQuestionPaper = async (config: {
    courseId: string;
    patternId: string;
    bloomLevels: string[];
    questionTypes: string[];
    difficultyLevels: string[];
  }) => {
    try {
      // For now, we'll simulate the paper generation
      // In a real implementation, this would call a tRPC mutation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate a mock PDF download
      const paperContent = `Question Paper for Course ${config.courseId}`;
      downloadPDF(paperContent, `question-paper-${Date.now()}.pdf`);

      toast.success('Question paper generated and downloaded!');
    } catch (error) {
      console.error('Paper generation error:', error);
      throw error;
    }
  };

  // Question Bank handlers
  const handleApproveQuestion = async (questionId: string) => {
    try {
      await approveQuestionMutation.mutateAsync({ questionId });
      refetchQuestions();
      toast.success('Question approved successfully!');
    } catch (error) {
      console.error('Error approving question:', error);
      throw error;
    }
  };

  const handleRejectQuestion = async (questionId: string, reason: string) => {
    try {
      await rejectQuestionMutation.mutateAsync({ questionId, reason });
      refetchQuestions();
      toast.success('Question rejected');
    } catch (error) {
      console.error('Error rejecting question:', error);
      throw error;
    }
  };

  const handleEditQuestion = async (questionId: string, updates: { questionText?: string; sampleAnswer?: string }) => {
    try {
      await updateQuestionMutation.mutateAsync({
        questionId,
        questionText: updates.questionText,
        sampleAnswer: updates.sampleAnswer
      });
      refetchQuestions();
      toast.success('Question updated successfully!');
    } catch (error) {
      console.error('Error updating question:', error);
      throw error;
    }
  };

  const handleSubmitQuestions = async (questionIds: string[]) => {
    try {
      await submitQuestionsMutation.mutateAsync({ questionIds });
      refetchQuestions();
      toast.success('Questions submitted for review!');
    } catch (error) {
      console.error('Error submitting questions:', error);
      throw error;
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await deleteQuestionMutation.mutateAsync({ questionId });
      refetchQuestions();
      toast.success('Question deleted successfully!');
    } catch (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
  };

  const handleDeleteMultipleQuestions = async (questionIds: string[]) => {
    try {
      await deleteMultipleQuestionsMutation.mutateAsync({ questionIds });
      refetchQuestions();
      toast.success('Questions deleted successfully!');
    } catch (error) {
      console.error('Error deleting questions:', error);
      throw error;
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRefreshQuestions = () => {
    refetchQuestions();
  };

  const downloadPDF = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Redirect if not authenticated or not a coordinator
  if (status === 'loading' || coursesLoading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 rounded-2xl shadow-xl animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-8 bg-white/20 rounded w-80"></div>
              <div className="h-5 bg-white/15 rounded w-96"></div>
              <div className="flex space-x-4 mt-4">
                <div className="h-6 bg-white/20 rounded w-24"></div>
                <div className="h-4 bg-white/15 rounded w-48"></div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-20 w-20 bg-white/20 rounded-xl"></div>
              <div className="flex space-x-2">
                <div className="h-8 bg-white/20 rounded w-24"></div>
                <div className="h-8 bg-white/20 rounded w-20"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-5 w-5 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-12 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="space-y-6">
          <div className="h-10 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                    <div className="h-5 bg-gray-200 rounded w-24"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-40"></div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-12"></div>
                      <div className="space-y-1">
                        {[...Array(3)].map((_, j) => (
                          <div key={j} className="flex justify-between">
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                            <div className="h-3 bg-gray-200 rounded w-24"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="h-6 bg-blue-200 rounded w-8 mx-auto mb-1"></div>
                        <div className="h-3 bg-blue-200 rounded w-12 mx-auto"></div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="h-6 bg-green-200 rounded w-8 mx-auto mb-1"></div>
                        <div className="h-3 bg-green-200 rounded w-16 mx-auto"></div>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <div className="h-9 bg-gray-200 rounded flex-1"></div>
                      <div className="h-9 w-9 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  if (!['COURSE_COORDINATOR', 'MODULE_COORDINATOR', 'PROGRAM_COORDINATOR', 'ADMIN'].includes(session.user.role)) {
    router.push('/unauthorized');
    return null;
  }

  const typedCourses = courses as Course[] | undefined;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-8 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Course Coordinator Dashboard</h1>
            <p className="text-blue-100 text-lg">
              Welcome back, {session.user.firstName} {session.user.lastName}! Manage your courses and generate AI-powered questions.
            </p>
            <div className="flex items-center space-x-4 mt-4">
              <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                {session.user.role.replace('_', ' ')}
              </Badge>
              <span className="text-blue-200 text-sm">{session.user.email}</span>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-4">
            <div className="hidden lg:block">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
                <Brain className="w-12 h-12 text-white mb-2 mx-auto" />
                <p className="text-sm font-medium">BloomIQ AI</p>
              </div>
            </div>
            <div className="flex space-x-2">
              {session.user.role === 'ADMIN' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => router.push('/admin/dashboard')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Admin Panel
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">My Courses</CardTitle>
            <BookOpen className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{typedCourses?.length || 0}</div>
            <p className="text-xs text-blue-600">Active courses</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-900">Materials Uploaded</CardTitle>
            <FileText className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              {typedCourses?.reduce((acc: number, course: Course) => acc + (course._count?.materials || 0), 0) || 0}
            </div>
            <p className="text-xs text-green-600">Total materials</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-900">Questions Generated</CardTitle>
            <Brain className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">
              {typedCourses?.reduce((acc: number, course: Course) => acc + (course._count?.questions || 0), 0) || 0}
            </div>
            <p className="text-xs text-purple-600">AI-generated questions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-indigo-900">Your Role</CardTitle>
            <Users className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">{session.user.role.replace('_', ' ')}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="courses">My Courses</TabsTrigger>
          <TabsTrigger value="upload">Upload Materials</TabsTrigger>
          <TabsTrigger value="ai-generation">AI Question Generation</TabsTrigger>
          <TabsTrigger value="question-paper">Question Paper</TabsTrigger>
          <TabsTrigger value="questions">Question Bank</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {typedCourses?.map((course: Course) => (
              <Card key={course.id} className="hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg font-bold text-blue-900">{course.courseCode}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs font-medium ${course.courseCoordinatorId === session.user.id
                        ? 'bg-blue-100 text-blue-800 border-blue-300' :
                        course.moduleCoordinatorId === session.user.id
                          ? 'bg-green-100 text-green-800 border-green-300' :
                          'bg-purple-100 text-purple-800 border-purple-300'
                        }`}
                    >
                      {course.courseCoordinatorId === session.user.id ? 'Course Coordinator' :
                        course.moduleCoordinatorId === session.user.id ? 'Module Coordinator' : 'Program Coordinator'}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-gray-600 font-medium">{course.courseName}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Course Coordinators Info */}
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Team</div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Course:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {course.courseCoordinator?.firstName} {course.courseCoordinator?.lastName}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Module:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {course.moduleCoordinator?.firstName} {course.moduleCoordinator?.lastName}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Program:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {course.programCoordinator?.firstName} {course.programCoordinator?.lastName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600">{course._count?.materials || 0}</div>
                        <div className="text-xs text-blue-500 font-medium">Materials</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">{course._count?.questions || 0}</div>
                        <div className="text-xs text-green-500 font-medium">Questions</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2 mt-4">
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={() => router.push(`/course-coordinator/course/${course.id}`)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedCourse(course.id);
                        // Switch to AI generation tab
                        const aiTab = document.querySelector('[value="ai-generation"]') as HTMLElement;
                        aiTab?.click();
                      }}
                    >
                      <Brain className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty state */}
          {(!typedCourses || typedCourses.length === 0) && (
            <Card className="p-8 text-center">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Courses Assigned</h3>
              <p className="text-gray-500">You don&apos;t have any courses assigned yet. Contact your administrator to get courses assigned to you.</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Upload className="h-5 w-5" />
                Upload Course Materials
              </CardTitle>
              <CardDescription className="text-green-700">
                Upload syllabus and unit materials for your courses. Files will be processed for AI question generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FileUpload
                onFileSelect={setSelectedFile}
                onFileRemove={() => setSelectedFile(null)}
                selectedFile={selectedFile}
                uploading={uploading}
                uploadProgress={uploadProgress}
              />

              {typedCourses && typedCourses.length > 0 && (
                <div className="space-y-4">
                  <Label>Choose Course and Material Type</Label>
                  {typedCourses.map((course: Course) => (
                    <Card key={course.id} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-medium">{course.courseCode}</h4>
                          <p className="text-sm text-muted-foreground">{course.courseName}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                          variant="outline"
                          disabled={!selectedFile || uploading}
                          onClick={() => handleFileUpload(course.id, 'SYLLABUS')}
                          className="w-full"
                        >
                          {uploading ? 'Uploading...' : 'Upload as Syllabus'}
                        </Button>

                        <Button
                          variant="outline"
                          disabled={!selectedFile || uploading}
                          onClick={() => handleFileUpload(course.id, 'UNIT_MATERIAL', 1)}
                          className="w-full"
                        >
                          {uploading ? 'Uploading...' : 'Upload as Unit Material'}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {(!typedCourses || typedCourses.length === 0) && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No courses assigned. Contact your administrator.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-generation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Generation Form */}
            <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-purple-800">
                  <Brain className="h-5 w-5" />
                  <span>AI Question Generation</span>
                </CardTitle>
                <CardDescription className="text-purple-700">
                  Generate questions from your uploaded course materials using advanced AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Course Selection */}
                <div className="space-y-2">
                  <Label htmlFor="course-select" className="text-sm font-medium text-purple-900">Select Course</Label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a course..." />
                    </SelectTrigger>
                    <SelectContent>
                      {courses?.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.courseCode} - {course.courseName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Material Selection */}
                {selectedCourse && (
                  <div className="space-y-2">
                    <Label htmlFor="material-select">Select Material</Label>
                    <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose course material..." />
                      </SelectTrigger>
                      <SelectContent>
                        {materials?.map((material) => (
                          <SelectItem key={material.id} value={material.id}>
                            {material.title} ({material.materialType})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Unit Selection */}
                <div className="space-y-2">
                  <Label htmlFor="unit-select">Unit Number</Label>
                  <Select value={selectedUnit.toString()} onValueChange={(value) => setSelectedUnit(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((unit) => (
                        <SelectItem key={unit} value={unit.toString()}>
                          Unit {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Generation Configuration */}
                <div className="space-y-4">
                  <h4 className="font-medium">Generation Configuration</h4>

                  {/* Bloom Levels */}
                  <div className="space-y-2">
                    <Label>Questions per Bloom Level</Label>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {Object.entries(generationConfig.bloomLevels).map(([level, count]) => (
                        <div key={level} className="flex items-center justify-between">
                          <span>{level}</span>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setGenerationConfig(prev => ({
                                ...prev,
                                bloomLevels: {
                                  ...prev.bloomLevels,
                                  [level]: Math.max(0, count - 1)
                                }
                              }))}
                            >
                              -
                            </Button>
                            <span className="w-6 text-center">{count}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setGenerationConfig(prev => ({
                                ...prev,
                                bloomLevels: {
                                  ...prev.bloomLevels,
                                  [level]: count + 1
                                }
                              }))}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Question Types */}
                  <div className="space-y-2">
                    <Label>Question Types</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'STRAIGHTFORWARD', label: 'Straightforward Questions' },
                        { value: 'PROBLEM_BASED', label: 'Problem-based Questions' },
                        { value: 'SCENARIO_BASED', label: 'Scenario-based Questions' }
                      ].map((type) => (
                        <div key={type.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={type.value}
                            checked={generationConfig.questionTypes.includes(type.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setGenerationConfig(prev => ({
                                  ...prev,
                                  questionTypes: [...prev.questionTypes, type.value]
                                }));
                              } else {
                                setGenerationConfig(prev => ({
                                  ...prev,
                                  questionTypes: prev.questionTypes.filter(t => t !== type.value)
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={type.value} className="text-sm">{type.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty Levels */}
                  <div className="space-y-2">
                    <Label>Difficulty Levels</Label>
                    <div className="flex space-x-4">
                      {['EASY', 'MEDIUM', 'HARD'].map((level) => (
                        <div key={level} className="flex items-center space-x-2">
                          <Checkbox
                            id={level}
                            checked={generationConfig.difficultyLevels.includes(level)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setGenerationConfig(prev => ({
                                  ...prev,
                                  difficultyLevels: [...prev.difficultyLevels, level]
                                }));
                              } else {
                                setGenerationConfig(prev => ({
                                  ...prev,
                                  difficultyLevels: prev.difficultyLevels.filter(l => l !== level)
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={level} className="text-sm">{level}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleStartQuestionGeneration}
                  disabled={!selectedCourse || !selectedMaterial || startQuestionGenerationMutation.isPending}
                  className="w-full"
                >
                  {startQuestionGenerationMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting Generation...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Questions
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Active Jobs */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Generation Jobs</span>
                  </CardTitle>
                  <CardDescription>
                    Monitor the progress of your question generation jobs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {courseJobs && courseJobs.length > 0 ? (
                    <div className="space-y-4">
                      {courseJobs.slice(0, 3).map((job) => (
                        <div key={job.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium">Unit {job.unit}</div>
                            <Badge variant={job.status === 'COMPLETED' ? 'default' : job.status === 'FAILED' ? 'destructive' : 'secondary'}>
                              {job.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {job.material?.title} • {job.generatedCount}/{job.totalQuestions} questions
                          </div>
                          {job.status === 'PROCESSING' && (
                            <div className="mt-2">
                              <div className="h-2 bg-gray-200 rounded-full">
                                <div
                                  className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                                  style={{ width: `${job.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No generation jobs yet</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Start generating questions to see job progress here
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Active Job Status Cards */}
              {activeJobs.map((jobId) => (
                <JobStatusCard
                  key={jobId}
                  jobId={jobId}
                  onComplete={() => {
                    setActiveJobs(prev => prev.filter(id => id !== jobId));
                    toast.success('Question generation completed!');
                  }}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="questions" className="space-y-6">
          {/* Course Selection for Question Bank */}
          <Card>
            <CardHeader>
              <CardTitle>Select Course</CardTitle>
              <CardDescription>
                Choose a course to view and manage its generated questions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="question-course-select">Course</Label>
                  <Select value={selectedQuestionCourse} onValueChange={(value) => {
                    setSelectedQuestionCourse(value);
                    setCurrentPage(1); // Reset to first page when changing course
                  }}>
                    <SelectTrigger id="question-course-select">
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses?.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.courseCode} - {course.courseName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => setSelectedQuestionCourse('')}
                    variant="outline"
                    disabled={!selectedQuestionCourse}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Question Bank */}
          {selectedQuestionCourse ? (
            <QuestionBank
              questions={questionData?.questions.map(q => ({
                ...q,
                correctAnswer: q.correctAnswer || undefined
              })) || []}
              isLoading={questionsLoading}
              onRefresh={handleRefreshQuestions}
              onApproveQuestion={handleApproveQuestion}
              onRejectQuestion={handleRejectQuestion}
              onEditQuestion={handleEditQuestion}
              onSubmitQuestions={handleSubmitQuestions}
              onDeleteQuestion={handleDeleteQuestion}
              onDeleteMultipleQuestions={handleDeleteMultipleQuestions}
              totalQuestions={questionData?.pagination?.totalCount || 0}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              questionsPerPage={questionsPerPage}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select a course to view questions</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Choose a course from the dropdown above to view and manage AI-generated questions.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="question-paper" className="space-y-6">
          <QuestionPaperGenerator
            courses={typedCourses || []}
            onGenerate={handleGenerateQuestionPaper}
            isGenerating={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

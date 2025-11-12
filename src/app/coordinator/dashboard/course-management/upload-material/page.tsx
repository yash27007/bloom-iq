"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, FileText, CheckCircle, AlertCircle, X, Download, RefreshCw, BookOpen, Trash2, File, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";

export default function UploadMaterialPage() {
    // Form states
    const [selectedCourse, setSelectedCourse] = useState<string>("");
    const [materialTitle, setMaterialTitle] = useState<string>("");
    const [materialType, setMaterialType] = useState<"SYLLABUS" | "UNIT_PDF">("SYLLABUS");
    const [selectedUnit, setSelectedUnit] = useState<number>(1);

    // Upload states
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | null; text: string }>({ type: null, text: '' });
    const [dragActive, setDragActive] = useState(false);

    // Delete confirmation dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [materialToDelete, setMaterialToDelete] = useState<{ id: string; title: string } | null>(null);

    // tRPC queries
    const { data: courses = [], isLoading: coursesLoading } = trpc.coordinator.getCoursesForMaterialUpload.useQuery();
    const { data: materials = [], isLoading: materialsLoading, refetch: refetchMaterials } = trpc.coordinator.getUploadedMaterials.useQuery();

    // tRPC mutations
    const uploadMaterialMutation = trpc.coordinator.uploadCourseMaterial.useMutation({
        onSuccess: () => {
            toast.success('Material uploaded successfully! PDF parsing started in background.');
            refetchMaterials();
            // Reset form
            setMaterialTitle('');
            setSelectedCourse('');
            setMaterialType('SYLLABUS');
            setSelectedUnit(1);
            setMessage({ type: 'success', text: 'Material uploaded successfully!' });
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to upload material');
            setMessage({ type: 'error', text: error.message || 'Failed to upload material' });
        },
    });

    const deleteMaterialMutation = trpc.coordinator.deleteCourseMaterial.useMutation({
        onSuccess: (data) => {
            toast.success(`Material deleted successfully! ${data.deletedQuestions} questions removed.`);
            refetchMaterials();
            setDeleteDialogOpen(false);
            setMaterialToDelete(null);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to delete material');
        },
    });

    const loading = coursesLoading || materialsLoading;

    // Refresh function
    const refreshData = useCallback(() => {
        refetchMaterials();
        toast.info('Refreshing materials...');
    }, [refetchMaterials]);

    const uploadFile = useCallback(async (file: File) => {
        setUploading(true);
        setUploadProgress(0);
        setMessage({ type: null, text: '' });

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Simulate progress
            const progressInterval = setInterval(() => {
                setUploadProgress((prev) => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (response.ok) {
                const fileResult = await response.json();

                // Save the course material record using tRPC
                // PDF parsing will happen in background automatically
                await uploadMaterialMutation.mutateAsync({
                    courseId: selectedCourse,
                    title: materialTitle,
                    filename: fileResult.filename,
                    materialType: materialType,
                    unit: materialType === "UNIT_PDF" ? selectedUnit : 0,
                });

                // Reset progress after delay
                setTimeout(() => {
                    setUploadProgress(0);
                }, 2000);
            } else {
                const error = await response.json();
                const errorMessage = error.error || 'Upload failed';
                setMessage({ type: 'error', text: errorMessage });
                toast.error(errorMessage);
                setUploadProgress(0);
            }
        } catch (error) {
            console.error('Upload error:', error);
            const errorMessage = 'Upload failed. Please try again.';
            setMessage({ type: 'error', text: errorMessage });
            toast.error(errorMessage);
            setUploadProgress(0);
        } finally {
            setUploading(false);
            setDragActive(false);
        }
    }, [uploadMaterialMutation, selectedCourse, materialTitle, materialType, selectedUnit]);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        // Validate form before upload
        if (!selectedCourse) {
            setMessage({ type: 'error', text: 'Please select a course first' });
            toast.error('Please select a course first');
            return;
        }

        if (!materialTitle.trim()) {
            setMessage({ type: 'error', text: 'Please enter a title for the material' });
            toast.error('Please enter a title for the material');
            return;
        }

        await uploadFile(file);
    }, [selectedCourse, materialTitle, uploadFile]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf']
        },
        maxFiles: 1,
        disabled: uploading,
        onDragEnter: () => setDragActive(true),
        onDragLeave: () => setDragActive(false),
    });

    const clearMessage = () => {
        setMessage({ type: null, text: '' });
    };

    const handleDownloadMaterial = async (filePath: string, title: string) => {
        try {
            const response = await fetch(`/${filePath}`);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = title;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Download started');
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download file');
        }
    };

    const handleDeleteClick = (material: { id: string; title: string }) => {
        setMaterialToDelete(material);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!materialToDelete) return;
        await deleteMaterialMutation.mutateAsync({ materialId: materialToDelete.id });
    };

    const getParsingStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return (
                    <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                        <Clock className="h-3 w-3 mr-1" />
                        Parsing Pending
                    </Badge>
                );
            case 'PROCESSING':
                return (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Parsing...
                    </Badge>
                );
            case 'COMPLETED':
                return (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Parsed
                    </Badge>
                );
            case 'FAILED':
                return (
                    <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                        <XCircle className="h-3 w-3 mr-1" />
                        Parse Failed
                    </Badge>
                );
            default:
                return null;
        }
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            <div className="space-y-6">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Upload Course Material</h1>
                    <p className="text-muted-foreground">
                        Upload PDF materials for your courses. Files are automatically parsed for question generation.
                    </p>
                </div>

                {/* Upload Form Card */}
                <Card className="border-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            Upload New Material
                        </CardTitle>
                        <CardDescription>
                            Select a course, provide a title, and upload your PDF file (max 10MB)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Course Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="course" className="text-base font-semibold">Course *</Label>
                            <Select value={selectedCourse} onValueChange={setSelectedCourse} disabled={loading || uploading}>
                                <SelectTrigger id="course" className="w-full">
                                    <SelectValue placeholder={loading ? "Loading courses..." : "Select a course"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {courses.map((course) => (
                                        <SelectItem key={course.id} value={course.id}>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{course.course_code}</span>
                                                <span className="text-xs text-muted-foreground">{course.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Separator />

                        {/* Material Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-base font-semibold">Material Title *</Label>
                            <Input
                                id="title"
                                type="text"
                                placeholder="e.g., Unit 1: Introduction to Thermodynamics"
                                value={materialTitle}
                                onChange={(e) => setMaterialTitle(e.target.value)}
                                disabled={uploading}
                                className="text-base"
                            />
                        </div>

                        {/* Material Type */}
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">Material Type *</Label>
                            <RadioGroup
                                value={materialType}
                                onValueChange={(value: "SYLLABUS" | "UNIT_PDF") => setMaterialType(value)}
                                className="grid grid-cols-2 gap-4"
                                disabled={uploading}
                            >
                                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-accent">
                                    <RadioGroupItem value="SYLLABUS" id="syllabus" />
                                    <Label htmlFor="syllabus" className="cursor-pointer flex items-center gap-2 flex-1">
                                        <FileText className="h-5 w-5 text-blue-500" />
                                        <div>
                                            <div className="font-medium">Syllabus</div>
                                            <div className="text-xs text-muted-foreground">Course overview document</div>
                                        </div>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-accent">
                                    <RadioGroupItem value="UNIT_PDF" id="unit-pdf" />
                                    <Label htmlFor="unit-pdf" className="cursor-pointer flex items-center gap-2 flex-1">
                                        <BookOpen className="h-5 w-5 text-green-500" />
                                        <div>
                                            <div className="font-medium">Course Material</div>
                                            <div className="text-xs text-muted-foreground">Unit-specific content</div>
                                        </div>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Unit Selection (only for UNIT_PDF) */}
                        {materialType === "UNIT_PDF" && (
                            <div className="space-y-2">
                                <Label htmlFor="unit" className="text-base font-semibold">Select Unit *</Label>
                                <Select value={selectedUnit.toString()} onValueChange={(value) => setSelectedUnit(Number(value))} disabled={uploading}>
                                    <SelectTrigger id="unit">
                                        <SelectValue placeholder="Select unit" />
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
                        )}

                        <Separator />

                        {/* File Upload Dropzone */}
                        <div className="space-y-2">
                            <Label className="text-base font-semibold">Upload PDF File *</Label>
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${dragActive || isDragActive
                                        ? 'border-primary bg-primary/5 scale-[1.02]'
                                        : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50'
                                    } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <input {...getInputProps()} />
                                <div className="flex flex-col items-center gap-3">
                                    {uploading ? (
                                        <>
                                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                            <p className="text-lg font-medium">Uploading...</p>
                                            <Progress value={uploadProgress} className="w-64" />
                                            <p className="text-sm text-muted-foreground">{uploadProgress}% complete</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="rounded-full bg-primary/10 p-4">
                                                <Upload className="h-8 w-8 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-lg font-medium">
                                                    {isDragActive ? 'Drop the PDF file here' : 'Drag & drop a PDF file here'}
                                                </p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    or click to browse (max 10MB)
                                                </p>
                                            </div>
                                            <Badge variant="secondary" className="mt-2">PDF files only</Badge>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Message Alert */}
                        {message.type && (
                            <Alert className={`${message.type === 'error' ? 'border-destructive bg-destructive/10' : 'border-green-500 bg-green-50'}`}>
                                <div className="flex items-start gap-2">
                                    {message.type === 'error' ? (
                                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                                    ) : (
                                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                                    )}
                                    <div className="flex-1">
                                        <AlertDescription className={message.type === 'error' ? 'text-destructive' : 'text-green-700'}>
                                            {message.text}
                                        </AlertDescription>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearMessage}
                                        className="h-4 w-4 p-0"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {/* Uploaded Files Card */}
                <Card className="border-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <File className="h-5 w-5" />
                                    Uploaded Materials
                                    {!loading && materials.length > 0 && (
                                        <Badge variant="secondary" className="ml-2">{materials.length}</Badge>
                                    )}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    Manage your uploaded course materials and track parsing status
                                </CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={refreshData}
                                disabled={loading}
                                className="gap-2"
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                <span className="ml-3 text-muted-foreground">Loading materials...</span>
                            </div>
                        ) : materials.length === 0 ? (
                            <div className="text-center py-12 space-y-3">
                                <div className="rounded-full bg-muted/50 w-16 h-16 flex items-center justify-center mx-auto">
                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-lg font-medium text-muted-foreground">No materials uploaded yet</p>
                                    <p className="text-sm text-muted-foreground/75 mt-1">Upload your first PDF file using the form above</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {materials.map((material, index: number) => (
                                    <div
                                        key={material.id || index}
                                        className="flex items-center justify-between p-4 border-2 rounded-lg hover:border-primary/50 hover:bg-accent/30 transition-all group"
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="rounded-lg bg-red-50 p-3 group-hover:scale-110 transition-transform">
                                                <FileText className="h-6 w-6 text-red-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-base truncate">{material.title}</p>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <Badge variant="outline" className="text-xs">
                                                        {material.materialType === 'SYLLABUS' ? (
                                                            <FileText className="h-3 w-3 mr-1" />
                                                        ) : (
                                                            <BookOpen className="h-3 w-3 mr-1" />
                                                        )}
                                                        {material.materialType === 'SYLLABUS' ? 'Syllabus' : `Unit ${material.unit}`}
                                                    </Badge>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {material.course?.course_code || 'Unknown Course'}
                                                    </Badge>
                                                    {getParsingStatusBadge(material.parsingStatus)}
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(material.uploadedAt).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-muted-foreground hover:text-primary"
                                                onClick={() => handleDownloadMaterial(material.filePath, material.title)}
                                                title="Download"
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDeleteClick({ id: material.id, title: material.title })}
                                                disabled={deleteMaterialMutation.isPending}
                                                title="Delete"
                                            >
                                                {deleteMaterialMutation.isPending && materialToDelete?.id === material.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            Confirm Deletion
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2">
                                <div>
                                    Are you sure you want to delete <span className="font-semibold">&ldquo;{materialToDelete?.title}&rdquo;</span>?
                                </div>
                                <div className="text-sm">This action will:</div>
                                <ul className="text-sm space-y-1 ml-4 list-disc">
                                    <li>Delete the PDF file from storage</li>
                                    <li>Remove the database record</li>
                                    <li>Delete all associated generated questions</li>
                                    <li>Clear all parsing data and chunks</li>
                                </ul>
                                <div className="font-semibold text-destructive mt-3">
                                    This action cannot be undone!
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={deleteMaterialMutation.isPending}
                        >
                            {deleteMaterialMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Material
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

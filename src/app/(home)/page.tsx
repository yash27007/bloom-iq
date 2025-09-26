import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  FileText,
  Lightbulb,
  Users,
  Zap,
  GraduationCap,
  Award,
  Target,
  ChevronRight,
  CheckCircle2
} from "lucide-react";

export default function LandingPage() {
  const teamMembers = [
    {
      name: "Yashwanth Aravind",
      linkedin: "https://linkedin.com/in/yashwantharavind"
    },
    {
      name: "Aakash U",
      linkedin: "https://linkedin.com/in/aakash-u"
    },
    {
      name: "Anisha",
      linkedin: "https://linkedin.com/in/anisha"
    },
    {
      name: "Sushmitha",
      linkedin: "https://linkedin.com/in/sushmitha"
    }
  ];

  const features = [
    {
      title: "AI-Powered Generation",
      description: "Generate comprehensive question papers using advanced AI algorithms tailored for academic use",
      icon: Brain,
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Bloom's Taxonomy Integration",
      description: "Questions are structured according to Bloom's levels for optimal learning outcomes",
      icon: Target,
      color: "from-purple-500 to-pink-500"
    },
    {
      title: "Automated Answer Keys",
      description: "Get detailed answer keys with explanations for every generated question",
      icon: FileText,
      color: "from-green-500 to-emerald-500"
    },
    {
      title: "Multiple Difficulty Levels",
      description: "Create questions ranging from basic to advanced difficulty levels",
      icon: Award,
      color: "from-orange-500 to-red-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
      <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>

      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Bloom IQ
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/sign-in">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
                  Faculty Sign In <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20 pb-12 sm:pb-16">
        <div className="text-center">
          <Badge className="mb-4 sm:mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 hover:from-blue-200 hover:to-purple-200 border-0 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium shadow-md">
            <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
            College Question Paper Generation System
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight px-4">
            AI-Powered Question Paper
            <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-pulse">
              Generator
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 mb-8 sm:mb-10 max-w-4xl mx-auto leading-relaxed px-4">
            A proprietary system designed for our college faculty to create comprehensive question papers
            with answer keys using advanced AI and Bloom&apos;s Taxonomy principles.
          </p>
          <div className="flex justify-center mb-12 sm:mb-16">
            <Link href="/sign-in">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg">
                Access System <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <Badge className="mb-4 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-0 px-3 sm:px-4 py-2">
            System Features
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 px-4">
            Built for Academic Excellence
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
            Advanced AI technology integrated with educational principles to support our faculty in creating meaningful assessments
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/80 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-6 sm:p-8">
                <div className="mb-4 sm:mb-6">
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 group-hover:text-blue-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Team Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <Badge className="mb-4 bg-gradient-to-r from-green-100 to-blue-100 text-green-700 border-0 px-3 sm:px-4 py-2">
            Development Team
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 px-4">
            Meet Our Development Team
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
            Computer Science students passionate about creating innovative educational technology solutions
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-12 sm:mb-16">
          {teamMembers.map((member, index) => (
            <Card key={index} className="group text-center border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/80 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-6 sm:p-8">
                <div className="relative mb-4 sm:mb-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto flex items-center justify-center text-white font-bold text-lg sm:text-xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300 animate-pulse"></div>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3 group-hover:text-blue-600 transition-colors">
                  {member.name}
                </h3>
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors font-medium group-hover:underline text-sm sm:text-base"
                >
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Connect on LinkedIn
                </a>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Guidance Section */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-blue-100">
            <p className="text-gray-600 mb-4 sm:mb-6 text-base sm:text-lg font-medium">Project supervised by</p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white">
                <CardContent className="p-4 sm:p-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <p className="font-bold text-gray-900 text-base sm:text-lg">Dr. M.K Nagarajan</p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">Faculty Supervisor</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white">
                <CardContent className="p-4 sm:p-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <p className="font-bold text-gray-900 text-base sm:text-lg">Ms. Reshni</p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">Faculty Supervisor</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse delay-500"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 text-center">
          <Badge className="mb-4 sm:mb-6 bg-white/20 text-white border-0 px-3 sm:px-4 py-2">
            Academic Project
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            College Question Paper Generation System
          </h2>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 lg:mb-10 opacity-90 max-w-4xl mx-auto px-4">
            A proprietary software solution developed specifically for our college faculty to streamline
            the question paper creation process using cutting-edge AI technology and educational principles.
          </p>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto">
            <h3 className="text-lg sm:text-xl font-semibold mb-4">System Objectives</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base">
              <div className="flex items-center">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-3 text-green-300" />
                Reduce question paper creation time
              </div>
              <div className="flex items-center">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-3 text-green-300" />
                Ensure educational quality standards
              </div>
              <div className="flex items-center">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-3 text-green-300" />
                Support multiple subjects and difficulty levels
              </div>
              <div className="flex items-center">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-3 text-green-300" />
                Generate comprehensive answer keys
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-gradient-to-r from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
            {/* Logo and Description */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Lightbulb className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Bloom IQ
                </div>
              </div>
              <p className="text-gray-600 mb-4 max-w-md text-sm sm:text-base">
                A proprietary question paper generation system designed for our college.
                Built by students, for educators, to enhance the academic assessment process.
              </p>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Project Information</h3>
              <ul className="space-y-2 text-gray-600 text-xs sm:text-sm">
                <li>Academic Year: 2024-25</li>
                <li>Department: Computer Science</li>
                <li>Project Type: Final Year</li>
                <li>Technology: AI & Machine Learning</li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-6 sm:pt-8 text-center text-gray-600">
            <p className="mb-2 text-sm sm:text-base">© 2025 Bloom IQ - College Project. All rights reserved.</p>
            <p className="text-xs sm:text-sm flex items-center justify-center">
              <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-green-500" />
              Enhancing education through AI and Bloom&apos;s Taxonomy
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
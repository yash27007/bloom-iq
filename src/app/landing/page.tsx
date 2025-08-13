"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    BookOpen,
    Users,
    FileText,
    Brain,
    CheckCircle,
    Shield,
    Zap,
    Target,
    BarChart3,
    ArrowRight,
    Star,
    Menu,
    X
} from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"

const features = [
    {
        icon: <BookOpen className="h-8 w-8" />,
        title: "Smart Course Management",
        description: "Upload syllabi and course materials with automatic processing and organization.",
        color: "bg-blue-500"
    },
    {
        icon: <Brain className="h-8 w-8" />,
        title: "AI-Powered Question Generation",
        description: "Generate questions automatically using Bloom's Taxonomy and AI analysis of course content.",
        color: "bg-purple-500"
    },
    {
        icon: <Target className="h-8 w-8" />,
        title: "Bloom's Taxonomy Integration",
        description: "Ensure cognitive skill coverage with automatic Bloom's level classification.",
        color: "bg-green-500"
    },
    {
        icon: <Users className="h-8 w-8" />,
        title: "Multi-Role Collaboration",
        description: "Streamlined workflow for coordinators, reviewers, and examination controllers.",
        color: "bg-orange-500"
    },
    {
        icon: <CheckCircle className="h-8 w-8" />,
        title: "Review & Approval System",
        description: "Built-in review process with approval workflows and feedback mechanisms.",
        color: "bg-red-500"
    },
    {
        icon: <FileText className="h-8 w-8" />,
        title: "Custom Paper Patterns",
        description: "Create flexible question paper patterns with configurable sections and marks distribution.",
        color: "bg-indigo-500"
    },
    {
        icon: <BarChart3 className="h-8 w-8" />,
        title: "Analytics & Insights",
        description: "Track question distribution, difficulty levels, and cognitive outcome coverage.",
        color: "bg-teal-500"
    },
    {
        icon: <Shield className="h-8 w-8" />,
        title: "Secure & Confidential",
        description: "Role-based access control ensures question paper security and confidentiality.",
        color: "bg-pink-500"
    }
]

const roles = [
    {
        title: "Course Coordinator",
        description: "Upload materials, manage questions, create paper patterns",
        features: ["Upload syllabus & materials", "Generate questions", "Create paper patterns", "Submit for review"]
    },
    {
        title: "Module Coordinator",
        description: "Review and approve questions from course coordinators",
        features: ["Review questions", "Approve/reject submissions", "Provide feedback", "Monitor quality"]
    },
    {
        title: "Program Coordinator",
        description: "Oversee program-wide question standards and compliance",
        features: ["Program oversight", "Standards compliance", "Cross-course coordination", "Quality assurance"]
    },
    {
        title: "Controller of Examination",
        description: "Final approval and secure paper generation",
        features: ["Final paper approval", "Secure PDF generation", "Confidential downloads", "Examination oversight"]
    }
]

export default function LandingPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const { data: session } = useSession()

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Navigation */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-3">
                            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-lg">
                                <Brain className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                BloomIQ
                            </span>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
                            <a href="#roles" className="text-gray-600 hover:text-gray-900 transition-colors">Roles</a>
                            <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">About</a>
                            {session ? (
                                <Button asChild>
                                    <Link href="/dashboard">Dashboard</Link>
                                </Button>
                            ) : (
                                <Button asChild>
                                    <Link href="/auth/signin">Login</Link>
                                </Button>
                            )}
                        </div>

                        {/* Mobile menu button */}
                        <div className="md:hidden">
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="text-gray-600 hover:text-gray-900"
                            >
                                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-200">
                        <div className="px-2 pt-2 pb-3 space-y-1">
                            <a href="#features" className="block px-3 py-2 text-gray-600 hover:text-gray-900">Features</a>
                            <a href="#roles" className="block px-3 py-2 text-gray-600 hover:text-gray-900">Roles</a>
                            <a href="#about" className="block px-3 py-2 text-gray-600 hover:text-gray-900">About</a>
                            <div className="px-3 py-2">
                                {session ? (
                                    <Button asChild className="w-full">
                                        <Link href="/dashboard">Dashboard</Link>
                                    </Button>
                                ) : (
                                    <Button asChild className="w-full">
                                        <Link href="/auth/signin">Login</Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="pt-20 pb-32 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto text-center">
                    <Badge variant="secondary" className="mb-6">
                        <Zap className="h-3 w-3 mr-1" />
                        AI-Powered Question Generation
                    </Badge>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
                        Intelligent Question Paper
                        <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Generation System
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
                        Transform your examination process with AI-powered question generation,
                        Bloom&apos;s taxonomy integration, and collaborative workflows for educational excellence.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button size="lg" className="text-lg px-8 py-4" asChild>
                            <Link href="/auth/signin">
                                Get Started
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" className="text-lg px-8 py-4">
                            Watch Demo
                        </Button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Comprehensive Features
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Everything you need for modern, efficient question paper generation and management.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, index) => (
                            <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/50 backdrop-blur-sm">
                                <CardHeader className="pb-4">
                                    <div className={`${feature.color} p-3 rounded-lg w-fit text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                        {feature.icon}
                                    </div>
                                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-gray-600">
                                        {feature.description}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Roles Section */}
            <section id="roles" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Designed for Every Role
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Tailored workflows and permissions for each stakeholder in the examination process.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {roles.map((role, index) => (
                            <Card key={index} className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                                <CardHeader>
                                    <CardTitle className="text-xl text-gray-900">{role.title}</CardTitle>
                                    <CardDescription className="text-gray-600">
                                        {role.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {role.features.map((feature, featureIndex) => (
                                            <li key={featureIndex} className="flex items-center space-x-2">
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                <span className="text-sm text-gray-600">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Statistics Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="text-4xl font-bold text-blue-600 mb-2">500+</div>
                            <div className="text-gray-600">Questions Generated</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-purple-600 mb-2">50+</div>
                            <div className="text-gray-600">Courses Managed</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-green-600 mb-2">95%</div>
                            <div className="text-gray-600">Time Saved</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-orange-600 mb-2">100%</div>
                            <div className="text-gray-600">Bloom&apos;s Coverage</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                        Ready to Transform Your Examination Process?
                    </h2>
                    <p className="text-xl text-blue-100 mb-8">
                        Join educational institutions worldwide in revolutionizing question paper generation.
                    </p>
                    <Button size="lg" variant="secondary" className="text-lg px-8 py-4" asChild>
                        <Link href="/auth/signin">
                            Start Your Journey
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-lg">
                                    <Brain className="h-6 w-6 text-white" />
                                </div>
                                <span className="text-2xl font-bold">BloomIQ</span>
                            </div>
                            <p className="text-gray-400 mb-4">
                                Intelligent question paper generation system powered by AI and Bloom&apos;s taxonomy.
                            </p>
                            <div className="flex space-x-4">
                                <Star className="h-5 w-5 text-yellow-400" />
                                <Star className="h-5 w-5 text-yellow-400" />
                                <Star className="h-5 w-5 text-yellow-400" />
                                <Star className="h-5 w-5 text-yellow-400" />
                                <Star className="h-5 w-5 text-yellow-400" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Features</h3>
                            <ul className="space-y-2 text-gray-400">
                                <li>AI Question Generation</li>
                                <li>Bloom&apos;s Taxonomy</li>
                                <li>Role Management</li>
                                <li>Secure Downloads</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Support</h3>
                            <ul className="space-y-2 text-gray-400">
                                <li>Documentation</li>
                                <li>Contact Support</li>
                                <li>System Status</li>
                                <li>Updates</li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                        <p>&copy; 2025 BloomIQ. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

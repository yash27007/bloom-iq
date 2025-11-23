import { Heart } from "lucide-react";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60 mt-auto">
            <div className="container mx-auto px-6 py-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>&copy; {currentYear} BloomIQ. All rights reserved.</span>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            Made with <Heart className="h-4 w-4 text-red-500 fill-current" /> by the BloomIQ Team
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Kalasalingam Academy of Research and Education</span>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border/50">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
                        <div>
                            AI-Powered Question Paper Generation System using Bloom&apos;s Taxonomy
                        </div>
                        <div className="flex items-center gap-4">
                            <span>Version 0.1.0</span>
                            <span>•</span>
                            <span>Built with Next.js & TypeScript</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
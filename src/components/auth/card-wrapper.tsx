import {
    Card,
    CardContent,
    CardFooter,
    CardHeader
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
type CardWrapperProps = {
    children: React.ReactNode,
    header: string,
    redirectLink?: string,
    backButtonText?: string
}
export const CardWrapper = ({ children, header, redirectLink, backButtonText }: CardWrapperProps) => {
    return (
        <Card>
            <CardHeader><h1 className="font-bold text-xl">{header}</h1></CardHeader>
            <CardContent>
                {children}
            </CardContent>
            {redirectLink && (
                <CardFooter>
                    <Button asChild variant="link" className="text-muted-foreground">
                        <Link href={redirectLink} >
                            {backButtonText}
                        </Link>
                    </Button>
                </CardFooter>
            )}

        </Card>
    )
}
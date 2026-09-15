import AppProvider from "../providers/app-provider.jsx";
import "./globals.css";

export const metadata = {
    title: "AI Video Studio",
    description:
        "Generate stunning short-form videos powered by AI — scripts, voices, visuals, all in one place.",
    keywords: "AI video, video generation, text to video, AI studio",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
            </head>
            <body>
                <AppProvider>{children}</AppProvider>
            </body>
        </html>
    );
}

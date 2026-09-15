import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import QueryProvider from "./query-provider";
import { ThemeProvider } from "./theme-provider";

const AppProvider = ({ children }) => {
    return (
        <ThemeProvider>
            <QueryProvider>
                <TooltipProvider>
                    {children}
                    <Toaster />
                </TooltipProvider>
            </QueryProvider>
        </ThemeProvider>
    );
};

export default AppProvider;

import { useTheme } from "@/lib/ThemeContext";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9 rounded-full"
    >
      {theme === "light" ? (
        <>
          <Moon className="h-5 w-5" />
          <span className="sr-only">{t("common.darkMode")}</span>
        </>
      ) : (
        <>
          <Sun className="h-5 w-5" />
          <span className="sr-only">{t("common.lightMode")}</span>
        </>
      )}
    </Button>
  );
}

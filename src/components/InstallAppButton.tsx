import { Download } from "lucide-react";
import { useInstallAction } from "@/hooks/useInstallAction";
import { AddToHomeScreenDialog } from "@/components/AddToHomeScreenDialog";

// Plain "Download App" control for use inline elsewhere on the site (e.g. the hero CTA
// row). For the homepage's main install pitch, see DownloadAppBanner instead.
export function InstallAppButton({ className }: { className?: string }) {
  const { installed, showIOSHelp, setShowIOSHelp, handleClick } = useInstallAction();

  if (installed) return null;

  return (
    <>
      <button type="button" onClick={handleClick} className={className ?? "btn-primary-pulse"}>
        <Download className="size-4" />
        Download App
      </button>
      <AddToHomeScreenDialog open={showIOSHelp} onOpenChange={setShowIOSHelp} />
    </>
  );
}

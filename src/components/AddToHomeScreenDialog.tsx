import { Share, SquarePlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// iOS's only install path — shared by every "Download App" control on the site so the
// instructions always look and read the same.
export function AddToHomeScreenDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs text-center">
        <DialogHeader>
          <DialogTitle>Add to Home Screen</DialogTitle>
          <DialogDescription>iOS only allows installing apps this way.</DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-3 text-sm">
          <p className="flex items-center justify-center gap-2">
            1. Tap <Share className="size-4 text-primary" /> <strong>Share</strong> in Safari's toolbar
          </p>
          <p className="flex items-center justify-center gap-2">
            2. Tap <SquarePlus className="size-4 text-primary" /> <strong>Add to Home Screen</strong>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

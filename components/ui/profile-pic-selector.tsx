
import * as React from "react"
import { Camera, Plus, User, Check, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

const DEFAULT_AVATARS = [
  "/avatars/avatar1.png",
  "/avatars/avatar2.png",
  "/avatars/avatar3.png",
  "/avatars/avatar4.png",
  "/avatars/avatar5.png",
  "/avatars/avatar6.png",
  "/avatars/avatar7.png",
  "/avatars/avatar8.png",
  "/avatars/avatar9.png",
  "/avatars/avatar10.png",
]

interface ProfilePicSelectorProps {
  onImageSelect: (image: string | null) => void
  selectedImage: string | null
}

export default function ProfilePicSelector({ onImageSelect, selectedImage }: ProfilePicSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleImageClick = () => {
    setIsOpen(!isOpen)
  }

  const handleSelectAvatar = (url: string) => {
    onImageSelect(url)
    setIsOpen(false)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        onImageSelect(reader.result as string)
        setIsOpen(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="relative group">
        <button
          type="button"
          onClick={handleImageClick}
          className={cn(
            "relative h-24 w-24 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden transition-all duration-300 hover:border-primary/50",
            selectedImage && "border-solid border-primary"
          )}
        >
          {selectedImage ? (
            <img src={selectedImage} alt="Selected profile" className="h-full w-full object-cover" />
          ) : (
            <User className="h-10 w-10 text-muted-foreground" />
          )}
          
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="text-white h-6 w-6" />
          </div>
        </button>

        <AnimatePresence>
          {selectedImage && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              type="button"
              onClick={() => onImageSelect(null)}
              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm transition-transform hover:scale-110"
            >
              <X className="h-3 w-3" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full overflow-hidden"
          >
            <div className="p-4 bg-muted/50 rounded-xl border border-border">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Choose an Avatar
                </span>
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2 mb-4">
                {DEFAULT_AVATARS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectAvatar(url)}
                    className={cn(
                      "relative h-10 w-10 rounded-full overflow-hidden border-2 border-transparent transition-all hover:scale-110",
                      selectedImage === url && "border-primary"
                    )}
                  >
                    <img src={url} alt={`Avatar ${i}`} className="h-full w-full object-cover" />
                    {selectedImage === url && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="text-primary h-4 w-4 font-bold" />
                      </div>
                    )}
                  </button>
                ))}
                
                <button
                  type="button"
                  onClick={triggerFileUpload}
                  className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center transition-all hover:border-primary hover:scale-110 group"
                >
                  <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*"
                  />
                </button>
              </div>

              <p className="text-[10px] text-center text-muted-foreground">
                Or upload your own image from your computer
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

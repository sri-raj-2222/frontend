"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { NavItemData } from "../../data/navigation-data"

export function AnimatedNavigationTabs({ items }: { items: NavItemData[] }) {
  const [openItem, setOpenItem] = useState<NavItemData | null>(null);

  return (
    <div 
      className="flex items-center justify-center gap-2 static"
      onMouseLeave={() => setOpenItem(null)}
    >
      <ul className="flex items-center justify-center gap-2">
        {(items || []).map((item) => {
          const isOpen = openItem?.id === item.id;

          return (
            <button
              key={item.id}
              className={cn(
                "relative transition-colors duration-300 rounded-md text-foreground font-medium",
                isOpen
                  ? "text-foreground font-semibold"
                  : "hover-grey-underline"
              )}
              onClick={() => setOpenItem(item === openItem ? null : item)}
              onMouseEnter={() => setOpenItem(item)}
              aria-expanded={isOpen}
            >
              <div className="px-5 py-2 relative z-10 tracking-wider text-sm whitespace-nowrap">
                {item.label}
              </div>


            </button>
          );
        })}
      </ul>

      {/* Upwork-style Mega Menu Dropdown Tray */}
      <AnimatePresence>
        {openItem && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-[64px] left-0 w-full bg-background border-b border-border shadow-xl z-40"
            onMouseEnter={() => setOpenItem(openItem)}
          >
            <div className="mx-auto max-w-7xl px-8 py-10 w-full">

              {/* Categorized Columns Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-12 gap-y-12">
                {openItem.categories.map((category, idx) => (
                  <div key={idx} className="flex flex-col">
                    <h3 className="font-semibold text-foreground mb-4">
                      {category.title}
                    </h3>
                    <ul className="space-y-3">
                      {category.links.map((link, linkIdx) => (
                        <li key={linkIdx}>
                          <a
                            href={link.href}
                            className="text-sm text-muted-foreground hover-grey-underline hover:underline underline-offset-[3px] transition-all duration-300 block cursor-pointer w-full"
                          >
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { cn } from "@/lib/utils"
import goldBankLogo from "@/assets/goldbank-logo.png"

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  showText?: boolean
}

const sizeMap = {
  sm: "h-7",
  md: "h-9",
  lg: "h-14",
  xl: "h-20",
}

export function Logo({ size = "md", className }: LogoProps) {
  return (
    <img
      src={goldBankLogo}
      alt="GoldBank"
      className={cn("w-auto object-contain", sizeMap[size], className)}
    />
  )
}

export default Logo

import Image from 'next/image'
import Link from 'next/link'

export default function Logo({
  size = 40,
  href,
}: {
  size?: number
  href?: string
}) {
  const img = (
    <Image
      src="/lgo-logo.png"
      alt="lgo"
      width={size}
      height={size}
      className="rounded-xl"
      priority
    />
  )

  if (href) {
    return <Link href={href}>{img}</Link>
  }
  return img
}

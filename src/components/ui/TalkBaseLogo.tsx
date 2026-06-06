import Image from 'next/image'

type Variant = 'icon' | 'icon-filled' | 'wordmark'

interface Props {
  size?: number
  variant?: Variant
  className?: string
}

const SRC: Record<Variant, string> = {
  'icon':         '/logo/icon.svg',
  'icon-filled':  '/logo/icon-filled.svg',
  'wordmark':     '/logo/wordmark.svg',
}

const ASPECT: Record<Variant, number> = {
  'icon':        1,
  'icon-filled': 1,
  'wordmark':    553 / 142,
}

export default function TalkBaseLogo({
  size = 40,
  variant = 'icon',
  className = '',
}: Props) {
  const width = variant === 'wordmark' ? size * ASPECT.wordmark : size
  const height = size

  return (
    <Image
      src={SRC[variant]}
      alt="TalkBase"
      width={width}
      height={height}
      priority
      className={className}
    />
  )
}

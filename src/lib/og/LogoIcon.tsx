// ImageResponse 전용 로고 SVG (간단화 버전)
// 모든 OG 이미지에서 공통으로 사용

export default function LogoIcon({
  size = 240,
  fill = false,
}: {
  size?: number
  fill?: boolean
}) {
  const bg = fill ? '#1A60FD' : 'transparent'
  const stroke = fill ? 'white' : '#1A60FD'

  return (
    <svg width={size} height={size} viewBox="0 0 239 239" style={{ display: 'flex' }}>
      {fill && <rect width="239" height="239" rx="46" fill={bg} />}

      {/* 데이터베이스 스택 */}
      <ellipse cx="119" cy="143" rx="63" ry="11" fill={stroke} opacity={fill ? 0.6 : 0.6} />
      <path d="M56 132 L56 144 Q56 152 119 152 Q182 152 182 144 L182 132 Z" fill={stroke} opacity={fill ? 0.85 : 0.7} />
      <ellipse cx="119" cy="162" rx="63" ry="11" fill={stroke} opacity={fill ? 0.6 : 0.6} />
      <path d="M56 151 L56 163 Q56 171 119 171 Q182 171 182 163 L182 151 Z" fill={stroke} opacity={fill ? 0.85 : 0.7} />
      <ellipse cx="119" cy="181" rx="63" ry="11" fill={stroke} opacity={fill ? 0.7 : 0.7} />

      {/* 말풍선 */}
      <path d="M51 54 H139 Q182 54 182 96 Q182 139 139 139 H117 L91 162 V139 H51 Q51 96 51 96 Q51 54 51 54 Z" fill={fill ? '#1A60FD' : 'white'} />
      <rect x="51" y="54" width="131" height="86" rx="43" fill="white" />
      <rect x="100" y="120" width="38" height="32" rx="7" fill="white" transform="rotate(-44 119 136)" />

      {/* 오디오 파형 */}
      <rect x="81" y="91" width="8" height="13" rx="4" fill="#1A60FD" />
      <rect x="97" y="81" width="8" height="32" rx="4" fill="#1A60FD" />
      <rect x="113" y="73" width="8" height="49" rx="4" fill="#1A60FD" />
      <rect x="129" y="81" width="8" height="32" rx="4" fill="#1A60FD" />
      <rect x="145" y="91" width="8" height="13" rx="4" fill="#1A60FD" />
    </svg>
  )
}

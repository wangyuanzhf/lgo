import Logo from '@/app/components/Logo'

export default function RegisterConfirmPage() {
  return (
    <div className="min-h-screen bg-[#f6f8fa] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-6">
        <Logo size={48} />
      </div>

      {/* Card */}
      <div className="w-full max-w-[340px]">
        <div className="bg-white border border-[#d0d7de] rounded-md px-8 py-6 mb-4 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-[#dafbe1] flex items-center justify-center">
              <svg viewBox="0 0 16 16" width="24" height="24" fill="#1f883d">
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
              </svg>
            </div>
          </div>

          <h1 className="text-[20px] font-semibold text-[#1f2328] mb-3">
            请验证您的邮箱
          </h1>

          <p className="text-sm text-[#57606a] leading-relaxed mb-2">
            我们已向您的邮箱发送了一封验证邮件。
          </p>
          <p className="text-sm text-[#57606a] leading-relaxed">
            请查收邮件并点击其中的激活链接，完成账号验证后即可登录。
          </p>

          <div className="mt-5 pt-5 border-t border-[#d0d7de]">
            <p className="text-xs text-[#57606a]">
              没有收到邮件？请检查垃圾邮件文件夹，或稍后重试。
            </p>
          </div>
        </div>

        {/* Back to login */}
        <div className="bg-white border border-[#d0d7de] rounded-md px-8 py-4 text-sm text-center text-[#1f2328]">
          <a href="/login" className="text-[#0969da] font-semibold hover:underline">
            返回登录
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-[#57606a]">
        {['服务条款', '隐私政策', '安全', '联系我们'].map(item => (
          <a key={item} href="#" className="hover:text-[#0969da] hover:underline">
            {item}
          </a>
        ))}
      </footer>
    </div>
  )
}

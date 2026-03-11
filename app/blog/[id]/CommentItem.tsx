type Comment = {
  id: string
  author_name: string
  body: string
  status: string
  created_at: string
  anon_token: string
}

export default function CommentItem({
  comment,
  myToken,
}: {
  comment: Comment
  myToken: string
}) {
  const isMine = comment.anon_token === myToken
  const isPending = comment.status === 'pending'

  return (
    <div className="text-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-medium text-[#1f2328]">{comment.author_name}</span>
        {isPending && isMine && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-[#fff8c5] text-[#7d4e00] border border-[#e3b341]">
            审核中
          </span>
        )}
        <span className="text-xs text-[#57606a]">
          {new Date(comment.created_at).toLocaleString('zh-CN')}
        </span>
      </div>
      <p className="text-[#1f2328] whitespace-pre-wrap">{comment.body}</p>
    </div>
  )
}

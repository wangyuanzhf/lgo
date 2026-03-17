import { createClient } from '@/lib/supabase/client'

export async function uploadImageToStorage(file: File, userId: string): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('请选择图片文件')
  if (file.size > 5 * 1024 * 1024) throw new Error('图片大小不能超过 5MB')

  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('post-images').upload(path, file)
  if (error) throw new Error('上传失败：' + error.message)
  const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(path)
  return publicUrl
}

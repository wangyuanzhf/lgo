/**
 * markedWithMath
 *
 * 用占位符保护 $...$ / $$...$$ 不被 marked 的 Markdown 解析器破坏
 * （_ 斜体、{ 等特殊字符在公式里不应被处理）
 * 然后把 marked 输出的 HTML 里的占位符替换回 KaTeX 渲染结果。
 */
import { marked } from 'marked'
import katex from 'katex'

export async function markedWithMath(markdown: string): Promise<string> {
  const placeholders: string[] = []

  // 先保护 block math ($$...$$)，必须在 inline 之前
  let protected_ = markdown.replace(/\$\$([\s\S]+?)\$\$/g, (_, math: string) => {
    const id = `MATHBLOCK${placeholders.length}ENDMATH`
    placeholders.push(
      katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
        trust: false,
      })
    )
    return id
  })

  // 再保护 inline math ($...$)
  // 排除 $$ 开头（已被上面处理），以及空 $$
  protected_ = protected_.replace(/\$([^$\n]+?)\$/g, (_, math: string) => {
    const id = `MATHINLINE${placeholders.length}ENDMATH`
    placeholders.push(
      katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
        trust: false,
      })
    )
    return id
  })

  // 正常跑 marked
  let html = await marked(protected_, { async: true })

  // 还原占位符
  html = html.replace(/MATH(?:BLOCK|INLINE)(\d+)ENDMATH/g, (_, i: string) => {
    return placeholders[parseInt(i, 10)] ?? ''
  })

  return html
}

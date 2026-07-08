import { initBotId } from 'botid/client/core'

// Vercel BotID: 保護対象のパス + メソッドを宣言する。
// Server Action は「呼び出し元ページの path への POST」として実行されるため、
// 公開フォーム /request/post (投稿記事) への POST を保護すると submitMiniInquiry が守られる。
// ローカル開発では常に isBot:false が返るためフォームの動作確認は阻害されない。
initBotId({
  protect: [
    {
      path: '/request/post',
      method: 'POST',
    },
    {
      path: '/request/long',
      method: 'POST',
    },
  ],
})

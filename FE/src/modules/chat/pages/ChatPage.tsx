import { AlertTriangle, Bot, Loader2, RotateCcw, SquarePen } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { getApiErrorMessage } from '@/shared/api/api-error';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { chatConfig } from '../chat.config';
import { ChatComposer } from '../components/ChatComposer';
import { ChatMessageBubble } from '../components/ChatMessageBubble';
import { useChat } from '../hooks/use-chat';

export const ChatPage = () => {
  const { messages, send, retry, reset, isThinking, error } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isThinking, error]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={chatConfig.botName}
        description="Example AI chat powered by Google Gemini (free tier)."
        actions={
          <Button variant="outline" onClick={reset} disabled={messages.length === 0}>
            <SquarePen className="size-4" />
            New chat
          </Button>
        }
      />

      <Card className="flex h-[calc(100vh-15rem)] min-h-[420px] flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="size-6" />
              </div>
              <p className="max-w-md text-sm text-muted-foreground">{chatConfig.welcomeMessage}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {chatConfig.suggestions.map((suggestion) => (
                  <Button key={suggestion} variant="outline" size="sm" onClick={() => send(suggestion)}>
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => <ChatMessageBubble key={index} message={message} />)
          )}

          {isThinking && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {chatConfig.botName} is thinking…
            </div>
          )}

          {error && (
            <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 p-3 text-sm">
              <AlertTriangle className="size-4 text-destructive" />
              <span className="flex-1">{getApiErrorMessage(error, 'The AI did not answer. Please try again.')}</span>
              <Button variant="outline" size="sm" onClick={retry}>
                <RotateCcw className="size-4" />
                Try again
              </Button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t p-3">
          <ChatComposer disabled={isThinking} onSend={send} />
        </div>
      </Card>
    </div>
  );
};

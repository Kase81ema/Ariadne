import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { schoolAPI } from '../lib/api';
import { Send, HelpCircle, Loader2, User, Bot } from 'lucide-react';

export default function AssistantPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Ciao! Sono l\'assistente Ariadne. Posso aiutarti con informazioni su corsi, materiali e servizi. Cosa vuoi sapere?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setInput('');
    setLoading(true);
    try {
      const res = await schoolAPI.assistantQuery(q);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.answer }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Mi dispiace, si e verificato un errore. Riprova o contatta la segreteria.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]" data-testid="assistant-page">
      <div className="mb-6">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Assistente</h1>
        <p className="text-base text-gray-500">Chiedi informazioni su corsi, servizi e materiali Ariadne</p>
      </div>

      {/* Chat area */}
      <Card className="border-gray-100 flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-[#7B61FF]/8 text-[#7B61FF] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <HelpCircle className="w-4 h-4" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-[#7B61FF] text-white rounded-br-md'
                  : 'bg-gray-50 text-gray-700 rounded-bl-md'
              }`} data-testid={`chat-msg-${i}`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#7B61FF]/8 text-[#7B61FF] flex items-center justify-center flex-shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="bg-gray-50 rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-3">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Scrivi una domanda..."
              rows={1}
              className="resize-none min-h-[44px]"
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              data-testid="assistant-input"
            />
            <Button onClick={handleSend} disabled={loading || !input.trim()} className="h-11 w-11 flex-shrink-0" data-testid="assistant-send">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">L'assistente risponde usando i materiali e le informazioni disponibili. Per richieste specifiche, contatta la segreteria.</p>
        </div>
      </Card>
    </div>
  );
}

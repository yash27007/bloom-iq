"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Bot, User, Trash2, FileText, Cpu, MessageSquare, Sparkles } from "lucide-react";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function ChatPDFPage() {
  const [selectedMaterial, setSelectedMaterial] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("gemma3:4b");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch materials and models
  const { data: materials = [], isLoading: materialsLoading } = trpc.coordinator.getUploadedMaterials.useQuery();
  const { data: ollamaModels = [], isLoading: modelsLoading } = trpc.coordinator.getOllamaModels.useQuery();

  // Chat mutation
  const chatMutation = trpc.coordinator.chatWithPDF.useMutation({
    onSuccess: (response) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: response.answer,
          timestamp: new Date(),
        },
      ]);
      setIsLoading(false);
    },
    onError: (error) => {
      console.error("[Chat] Error:", error);
      toast.error(error.message || "Failed to get response");
      setIsLoading(false);
      // Remove the user message if the request failed
      setMessages((prev) => prev.slice(0, -1));
    },
  });

  // Load chat history
  const { data: history } = trpc.coordinator.getChatHistory.useQuery(
    { materialId: selectedMaterial },
    { enabled: !!selectedMaterial }
  );

  useEffect(() => {
    if (history) {
      setMessages(
        history.messages.map((msg: { id: string; role: string; content: string; timestamp: string }) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          timestamp: new Date(msg.timestamp),
        }))
      );
    }
  }, [history]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedMaterial || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    await chatMutation.mutateAsync({
      materialId: selectedMaterial,
      message: input,
      model: selectedModel,
    });
  };

  const clearHistoryMutation = trpc.coordinator.clearChatHistory.useMutation({
    onSuccess: () => {
      setMessages([]);
      toast.success("Chat history cleared");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to clear history");
    },
  });

  const handleClearHistory = async () => {
    if (!selectedMaterial) return;
    clearHistoryMutation.mutate({ materialId: selectedMaterial });
  };

  const selectedMaterialData = materials.find((m: { id: string; title: string; course?: { course_code: string } }) => m.id === selectedMaterial);

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl flex flex-col" style={{ minHeight: 'calc(100vh - 12rem)' }}>
      {/* Header Section */}
      <div className="space-y-4 mb-6 flex-shrink-0">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Chat with PDF</h1>
              <p className="text-muted-foreground">
                Ask questions about your uploaded course materials using AI
              </p>
            </div>
          </div>
        </div>

        {/* Material and Model Selection */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <Label htmlFor="material" className="text-sm font-medium mb-2 block">
                  Course Material
                </Label>
                <Select value={selectedMaterial} onValueChange={setSelectedMaterial} disabled={materialsLoading}>
                  <SelectTrigger id="material" className="h-11">
                    <SelectValue placeholder={materialsLoading ? "Loading..." : "Select a material"} />
                  </SelectTrigger>
                  <SelectContent>
                    {materials
                      .filter((m: { parsingStatus: string; embeddingStatus: string }) => m.parsingStatus === "COMPLETED" && m.embeddingStatus === "COMPLETED")
                      .map((material: { id: string; title: string; course?: { course_code: string } }) => (
                        <SelectItem key={material.id} value={material.id}>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <div className="flex flex-col">
                              <span className="font-medium">{material.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {material.course?.course_code}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-1">
                <Label htmlFor="model" className="text-sm font-medium mb-2 block">
                  AI Model
                </Label>
                <Select value={selectedModel} onValueChange={setSelectedModel} disabled={modelsLoading}>
                  <SelectTrigger id="model" className="h-11">
                    <SelectValue placeholder={modelsLoading ? "Loading..." : "Select a model"} />
                  </SelectTrigger>
                  <SelectContent>
                    {ollamaModels.map((model: { name: string }) => (
                      <SelectItem key={model.name} value={model.name}>
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-primary" />
                          <span className="font-medium">{model.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedMaterial && (
                <div className="md:col-span-1 flex items-end">
                  <Button
                    variant="outline"
                    onClick={handleClearHistory}
                    className="w-full h-11 border-destructive/50 hover:bg-destructive/10 hover:border-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear History
                  </Button>
                </div>
              )}
            </div>
            {selectedMaterialData && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {selectedMaterialData.title}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Cpu className="h-3 w-3" />
                  {selectedModel}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface */}
      <Card className="flex-1 flex flex-col min-h-0 shadow-lg border-2">
        <CardHeader className="flex-shrink-0 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              {selectedMaterialData ? (
                <span>
                  Chat: <span className="text-primary">{selectedMaterialData.title}</span>
                </span>
              ) : (
                "Select a material to start chatting"
              )}
            </CardTitle>
            {messages.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {messages.length} {messages.length === 1 ? 'message' : 'messages'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden p-0">
          {/* Messages */}
          <ScrollArea className="flex-1 px-6 py-4 min-h-0" ref={scrollAreaRef}>
            <div className="space-y-6">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[400px] text-center">
                  <div className="space-y-4 max-w-md">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                      <div className="relative p-6 rounded-full bg-primary/10 inline-block">
                        <Bot className="h-16 w-16 text-primary mx-auto" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">Start a conversation</h3>
                      <p className="text-muted-foreground">
                        Ask questions about your selected material and get AI-powered answers
                      </p>
                    </div>
                    {!selectedMaterial && (
                      <p className="text-sm text-muted-foreground italic">
                        Select a material above to begin
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-primary/20">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-5 py-3 shadow-sm",
                        message.role === "user"
                          ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-sm"
                          : "bg-muted border border-border rounded-tl-sm"
                      )}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                      <p className={cn(
                        "text-xs mt-2",
                        message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {message.role === "user" && (
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-primary/20">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex gap-4 justify-start animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-primary/20">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div className="bg-muted border border-border rounded-2xl rounded-tl-sm px-5 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t bg-muted/30 p-4 flex-shrink-0">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={selectedMaterial ? "Ask a question about the material..." : "Select a material first..."}
                  disabled={!selectedMaterial || isLoading}
                  className="min-h-[48px] pr-12 rounded-xl border-2 focus:border-primary/50 transition-colors"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  Press Enter to send
                </div>
              </div>
              <Button
                onClick={handleSend}
                disabled={!selectedMaterial || !input.trim() || isLoading}
                size="lg"
                className="h-12 px-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>
            {selectedMaterial && (
              <p className="text-xs text-muted-foreground mt-2 ml-1">
                Powered by {selectedModel} • Answers are based on the selected material
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

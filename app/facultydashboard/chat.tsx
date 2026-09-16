"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatProps {
  onClose: () => void;
}

export default function Chat({ onClose }: ChatProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const AI_URL =
    process.env.NEXT_PUBLIC_AI_API || "http://localhost:8001";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    return () => {
      fetch(`${AI_URL}/api/v1/chat/${sessionId}`, {
        method: "DELETE",
      }).catch(() => {});
    };
  }, [sessionId, AI_URL]);

  const handleFileAdd = useCallback((incoming: FileList | null) => {
    if (!incoming) return;

    const allowed = [".pdf", ".docx", ".doc", ".pptx", ".ppt"];

    const valid = Array.from(incoming).filter((f) =>
      allowed.some((ext) => f.name.toLowerCase().endsWith(ext))
    );

    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));

      return [
        ...prev,
        ...valid.filter((f) => !names.has(f.name)),
      ];
    });
  }, []);

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();

    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const historySnapshot = [...messages];

    const updatedMessages: Message[] = [
      ...historySnapshot,
      {
        role: "user",
        content: userText,
      },
    ];

    setMessages(updatedMessages);
    setIsLoading(true);

    const aiIndex = updatedMessages.length;

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "",
      },
    ]);

    try {
      const formData = new FormData();

      formData.append("session_id", sessionId);
      formData.append("message", userText);
      formData.append(
        "history",
        JSON.stringify(historySnapshot)
      );

      files.forEach((f) => {
        formData.append("files", f);
      });

      const response = await fetch(`${AI_URL}/api/v1/chat`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(
          `Server error: ${response.status}`
        );
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error("No response stream");
      }

      const decoder = new TextDecoder();

      let aiContent = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        aiContent += decoder.decode(value, {
          stream: true,
        });

        const snapshot = aiContent;

        setMessages((prev) => {
          const copy = [...prev];

          copy[aiIndex] = {
            role: "assistant",
            content: snapshot,
          };

          return copy;
        });
      }

      setFiles([]);
    } catch (err: any) {
      setMessages((prev) => {
        const copy = [...prev];

        copy[aiIndex] = {
          role: "assistant",
          content: `**Error:** ${
            err?.message ||
            "Could not get a response. Make sure the AI server is running."
          }`,
        };

        return copy;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTextareaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setInput(e.target.value);

    e.target.style.height = "auto";

    e.target.style.height =
      Math.min(e.target.scrollHeight, 120) + "px";
  };

  return (
    <div
      className="
        fixed inset-0
        sm:inset-y-0 sm:right-0 sm:left-auto
        w-full sm:w-[450px]
        bg-surface
        shadow-2xl
        z-50
        flex flex-col
        overflow-hidden
        animate-slide-in-right
        dark:bg-[#0A0C10]
      "
    >
      {/* ───────────────── HEADER ───────────────── */}
      <div
        className="
          px-3 py-3
          min-[360px]:px-4
          sm:px-6 sm:py-4
          border-b border-outline-variant
          bg-surface-container-lowest
          flex justify-between items-center
          shrink-0
          dark:bg-[#0A0C10]
          dark:border-[#1F2937]
        "
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div
            className="
              w-8 h-8
              sm:w-9 sm:h-9
              rounded-lg sm:rounded-xl
              bg-[#15803D]
              text-white
              flex items-center justify-center
              shrink-0
            "
          >
            <span className="material-symbols-outlined text-[17px] sm:text-[18px]">
              chat
            </span>
          </div>

          <div className="min-w-0">
            <p
              className="
                font-label-md
                text-label-md
                text-on-surface
                dark:text-[#FFFFFF]
                truncate
              "
            >
              Document Chat
            </p>

            <p
              className="
                font-label-sm
                text-label-sm
                text-on-surface-variant
                dark:text-[#E1E4E8]
                truncate
              "
            >
              RAG session
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close chat"
          className="
            w-8 h-8
            sm:w-9 sm:h-9
            flex items-center justify-center
            rounded-full
            hover:bg-surface-container-high
            transition-colors
            text-on-surface-variant
            dark:text-[#E1E4E8]
            dark:hover:bg-[#1F2937]
            shrink-0
          "
        >
          <span className="material-symbols-outlined text-[20px]">
            close
          </span>
        </button>
      </div>

      {/* ───────────────── BODY ───────────────── */}
      <div className="flex-1 flex min-h-0 min-w-0">
        {/* ───────── ATTACHMENTS ───────── */}

        <div
          className="
            hidden
            sm:block
            w-[220px]
            md:w-[260px]
            bg-surface
            dark:bg-[#0A0C10]
            border-r
            border-outline-variant
            dark:border-[#1F2937]
            p-4
            overflow-y-auto
            shrink-0
          "
        >
          <p
            className="
              font-label-sm
              text-label-sm
              text-on-surface-variant
              font-semibold
              mb-3
              dark:text-[#E1E4E8]
            "
          >
            Upload documents
          </p>

          <div
            className={`
              border-2 border-dashed
              rounded-xl
              p-5
              text-center
              cursor-pointer
              transition-colors
              ${
                isDragging
                  ? "border-primary-container bg-panel-tint"
                  : "border-outline-variant hover:bg-surface-container-low dark:border-[#1F2937] dark:hover:bg-[#1F2937]"
              }
            `}
            onClick={() =>
              fileInputRef.current?.click()
            }
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() =>
              setIsDragging(false)
            }
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);

              handleFileAdd(
                e.dataTransfer.files
              );
            }}
          >
            <span className="material-symbols-outlined text-[32px] text-outline block mx-auto mb-2">
              cloud_upload
            </span>

            <p className="font-label-md text-label-md text-on-surface dark:text-[#FFFFFF]">
              Drop files here or click
            </p>

            <p className="text-xs text-on-surface-variant mt-1 dark:text-[#E1E4E8]">
              PDF · DOCX · PPTX
            </p>
          </div>

          {files.length > 0 && (
            <>
              <p className="font-label-sm text-label-sm text-on-surface-variant font-semibold mt-5 mb-2 dark:text-[#E1E4E8]">
                Attached ({files.length})
              </p>

              <div className="space-y-2">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="
                      flex items-center gap-2
                      p-2
                      bg-panel-tint
                      border border-soft-accent
                      rounded-xl
                      dark:bg-[#0A0C10]
                      dark:border-[#1F2937]
                    "
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#15803D] shrink-0">
                      description
                    </span>

                    <span className="text-xs text-on-surface truncate flex-1 dark:text-[#E1E4E8]">
                      {f.name}
                    </span>

                    <button
                      onClick={() =>
                        removeFile(i)
                      }
                      className="
                        text-outline
                        hover:text-danger
                        transition-colors
                        shrink-0
                        dark:text-[#E1E4E8]
                        dark:hover:text-danger
                      "
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        close
                      </span>
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-[#15803D] mt-3 dark:text-[#4ADE80]">
                These will be sent with your next message.
              </p>
            </>
          )}

          {files.length === 0 &&
            messages.length === 0 && (
              <p className="text-xs text-on-surface-variant leading-relaxed mt-5 dark:text-[#E1E4E8]">
                Upload one or more documents,
                then ask questions. The AI will
                answer using your documents as
                context.
              </p>
            )}
        </div>

        {/* ───────── CHAT ───────── */}

        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}

          <div
            className="
              flex-1
              overflow-y-auto
              overflow-x-hidden
              px-2.5
              py-3
              min-[360px]:px-3
              sm:p-4
              space-y-3
              sm:space-y-4
            "
          >
            {messages.length === 0 && (
              <div className="flex gap-2 sm:gap-3 max-w-[94%] sm:max-w-[85%] min-w-0">
                <div
                  className="
                    w-7 h-7
                    sm:w-8 sm:h-8
                    rounded-full
                    bg-primary-container
                    text-on-primary
                    flex items-center justify-center
                    shrink-0
                  "
                >
                  <span className="material-symbols-outlined text-[14px] sm:text-[16px]">
                    smart_toy
                  </span>
                </div>

                <div
                  className="
                    min-w-0
                    max-w-full
                    bg-surface
                    border border-outline-variant
                    rounded-2xl rounded-tl-none
                    p-2.5 sm:p-3
                    shadow-sm
                    dark:bg-[#1F2937]
                    dark:border-[#1F2937]
                  "
                >
                  <p
                    className="
                      font-body-sm
                      text-body-sm
                      text-on-surface
                      dark:text-[#FFFFFF]
                      break-words
                      leading-5
                    "
                  >
                    Hello! I'm IntelliPaper
                    assistant. You can ask me
                    questions about specific CIS
                    documents, moderation
                    criteria, or past vetted
                    papers.
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div
                  key={i}
                  className="
                    flex gap-2
                    max-w-[92%]
                    sm:max-w-[85%]
                    self-end
                    flex-row-reverse
                    ml-auto
                    min-w-0
                  "
                >
                  <div
                    className="
                      min-w-0
                      max-w-full
                      bg-panel-tint
                      border border-soft-accent
                      rounded-2xl rounded-tr-none
                      p-2.5 sm:p-3
                      shadow-sm
                      dark:bg-[#0F766E]
                      dark:border-[#0F766E]
                    "
                  >
                    <p
                      className="
                        font-body-sm
                        text-body-sm
                        text-on-surface
                        dark:text-white
                        break-words
                        whitespace-pre-wrap
                      "
                    >
                      {msg.content}
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  key={i}
                  className="
                    flex gap-2
                    sm:gap-3
                    max-w-[94%]
                    sm:max-w-[85%]
                    min-w-0
                  "
                >
                  <div
                    className="
                      w-7 h-7
                      sm:w-8 sm:h-8
                      rounded-full
                      bg-primary-container
                      text-on-primary
                      flex items-center justify-center
                      shrink-0
                    "
                  >
                    <span className="material-symbols-outlined text-[14px] sm:text-[16px]">
                      smart_toy
                    </span>
                  </div>

                  <div
                    className="
                      min-w-0
                      max-w-full
                      bg-surface
                      border border-outline-variant
                      rounded-2xl rounded-tl-none
                      p-2.5 sm:p-3
                      shadow-sm
                      dark:bg-[#1F2937]
                      dark:border-[#1F2937]
                      overflow-hidden
                    "
                  >
                    {msg.content ? (
                      <div
                        className="
                          font-body-sm
                          text-body-sm
                          text-on-surface
                          dark:text-[#FFFFFF]
                          markdown-content
                          break-words
                          overflow-hidden
                        "
                      >
                        <ReactMarkdown>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <span className="flex gap-1 py-1">
                        <span className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce [animation-delay:300ms]" />
                      </span>
                    )}
                  </div>
                </div>
              )
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ───────── INPUT ───────── */}

          <div
            className="
              p-2
              min-[360px]:p-3
              sm:p-4
              border-t
              border-outline-variant
              bg-surface-container-lowest
              shrink-0
              dark:bg-[#0A0C10]
              dark:border-[#1F2937]
            "
          >
            {/* Attached files on mobile */}

            {files.length > 0 && (
              <div
                className="
                  sm:hidden
                  flex gap-1.5
                  overflow-x-auto
                  pb-2
                  scrollbar-hide
                "
              >
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="
                      flex items-center gap-1
                      shrink-0
                      max-w-[180px]
                      px-2 py-1
                      rounded-lg
                      bg-panel-tint
                      border border-soft-accent
                      dark:bg-[#1F2937]
                      dark:border-[#374151]
                    "
                  >
                    <span className="material-symbols-outlined text-[14px] text-[#15803D]">
                      description
                    </span>

                    <span className="text-[10px] truncate">
                      {file.name}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        removeFile(index)
                      }
                      className="shrink-0"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        close
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative flex items-center">
              {/* Attachment */}

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="
                  absolute
                  left-1.5
                  sm:left-2
                  p-1.5 sm:p-2
                  text-outline
                  hover:text-primary-container
                  transition-colors
                  rounded-full
                  dark:text-[#E1E4E8]
                  z-10
                "
                title="Attach files"
                aria-label="Attach files"
              >
                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                  attach_file
                </span>
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                rows={1}
                disabled={isLoading}
                className="
                  w-full
                  pl-9
                  sm:pl-10
                  pr-10
                  sm:pr-12
                  py-2.5
                  sm:py-3
                  bg-surface
                  border border-outline-variant
                  rounded-full
                  text-xs
                  sm:text-body-sm
                  font-body-sm
                  focus:border-primary-container
                  focus:ring-1
                  focus:ring-primary-container
                  transition-colors
                  shadow-sm
                  resize-none
                  dark:bg-[#0A0C10]
                  dark:border-[#1F2937]
                  dark:text-[#E1E4E8]
                  disabled:opacity-60
                  overflow-y-auto
                "
                style={{
                  minHeight: "40px",
                  maxHeight: "100px",
                }}
              />

              {/* Send */}

              <button
                type="button"
                onClick={sendMessage}
                disabled={
                  isLoading || !input.trim()
                }
                className="
                  absolute
                  right-1.5
                  sm:right-2
                  p-1.5 sm:p-2
                  text-primary-container
                  hover:bg-panel-tint
                  transition-colors
                  rounded-full
                  flex items-center justify-center
                  disabled:opacity-40
                  dark:hover:bg-[#1F2937]
                "
                title="Send"
                aria-label="Send message"
              >
                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                  send
                </span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.pptx,.ppt"
              className="hidden"
              onChange={(e) =>
                handleFileAdd(e.target.files)
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
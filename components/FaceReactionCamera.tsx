"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
};

export default function FaceReactionCamera({
  open,
  onClose,
  onCapture,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open) return;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
          },
          audio: false,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error(error);
        setErrorMessage("カメラを起動できませんでした。");
      }
    }

    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open]);

  function handleCapture() {
    const video = videoRef.current;

    if (!video) return;

    const size = Math.min(video.videoWidth, video.videoHeight);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");

    if (!context) return;

    const sourceX = (video.videoWidth - size) / 2;
    const sourceY = (video.videoHeight - size) / 2;

    context.drawImage(
      video,
      sourceX,
      sourceY,
      size,
      size,
      0,
      0,
      size,
      size
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const file = new File(
          [blob],
          `face-reaction-${crypto.randomUUID()}.jpg`,
          {
            type: "image/jpeg",
          }
        );

        const previewUrl = URL.createObjectURL(blob);

        onCapture(file, previewUrl);
        onClose();
      },
      "image/jpeg",
      0.9
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-6">
      <div className="w-full max-w-sm rounded-[32px] bg-white p-6 text-center shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="text-left">
            <p className="text-xs font-bold tracking-[0.12em] text-[#7b8475]">
              FACE REACTION
            </p>

            <h2 className="mt-1 text-xl font-bold text-[#252720]">
              今のリアクションを残そう
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-[#777]"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="mt-7 flex justify-center">
          <div className="relative h-56 w-56 overflow-hidden rounded-full border-4 border-white bg-black shadow-[0_12px_40px_rgba(0,0,0,0.25)] ring-4 ring-[#dfe8d8]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full scale-x-[-1] object-cover"
            />
          </div>
        </div>

        {errorMessage && (
          <p className="mt-5 text-sm font-medium text-red-600">
            {errorMessage}
          </p>
        )}

        <p className="mt-5 text-sm text-[#777c73]">
          円の中に顔を合わせて撮影してください。
        </p>

        <button
          type="button"
          onClick={handleCapture}
          disabled={Boolean(errorMessage)}
          className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full border-[6px] border-[#dfe8d8] bg-[#394536] shadow-lg transition active:scale-95 disabled:opacity-40"
          aria-label="撮影"
        >
          <span className="h-8 w-8 rounded-full bg-white" />
        </button>
      </div>
    </div>
  );
}
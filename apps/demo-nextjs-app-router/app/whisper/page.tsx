'use client';

import * as fal from '@fal-ai/serverless-client';
import { useCallback, useMemo, useState } from 'react';

// @snippet:start(client.config)
fal.config({
  // credentials:
    // '31d1836e-3150-4387-bb87-ba97354c1362:6c6ff4e8c527260a03f0bce7d4b0e6e7',
  requestMiddleware: fal.withProxy({
    targetUrl: '/api/fal/proxy', // the built-int nextjs proxy
    // targetUrl: 'http://localhost:3333/api/_fal/proxy', // or your own external proxy
  }),
});
// @snippet:end

// @snippet:start(client.result.type)
type Image = {
  url: string;
  file_name: string;
  file_size: number;
};
type Result = {
  image: Image;
};
// @snippet:end

type ErrorProps = {
  error: any;
};

function Error(props: ErrorProps) {
  if (!props.error) {
    return null;
  }
  return (
    <div
      className="p-4 mb-4 text-sm text-red-800 rounded bg-red-50 dark:bg-gray-800 dark:text-red-400"
      role="alert"
    >
      <span className="font-medium">Error</span> {props.error.message}
    </div>
  );
}

const DEFAULT_PROMPT =
  '(masterpiece:1.4), (best quality), (detailed), Medieval village scene with busy streets and castle in the distance';

async function record(stream: any): Promise<File> {
  const audioChunks: any = [];
  const mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = (e) => {
    console.log('startig');

    audioChunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    mediaRecorder.addEventListener('stop', async () => {
      console.log('sending request to fal');
      // Create a blob from the audio chunks
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      console.log(audioBlob);
      const audioFile = new File([audioBlob], 'recording.webm', {
        type: 'audio/webm',
      });
      console.log(audioFile);

      // console.log(audioBlob);
      resolve(audioFile);
    });
    setTimeout(() => {
      console.log('stopped');
      mediaRecorder.stop();
    }, 10000);
    mediaRecorder.start();
  });
}

// async function testAudio() {
//   useEffect(() => {

// }

// const result = await fal.subscribe("110602490-whisper", {
//   input: {
//     file_name: "recording.wav",
//     url: audioFile,
//   },
//   logs: true,
//   onQueueUpdate: (update) => {
//     console.log(update);
//   },
// });

export default function WhisperDemo() {
  // @snippet:start("client.ui.state")
  // Input state
  // const [prompt, setPrompt] = useState<string>(DEFAULT_PROMPT);
  // const [imageFile, setImageFile] = useState<File | null>(null);
  // Result state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  // @snippet:end
  const image = useMemo(() => {
    if (!result) {
      return null;
    }
    if (result.image) {
      return result.image;
    }
    return null;
  }, [result]);

  const reset = () => {
    setLoading(false);
    setError(null);
    setResult(null);
    setLogs([]);
    setElapsedTime(0);
  };

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return record(stream);
  }, []);

  const transcribeAudio = async (audioFile: File) => {
    reset();
    // @snippet:start("client.queue.subscribe")
    setLoading(true);
    const start = Date.now();
    try {
      const result: Result = await fal.subscribe('110602490-whisper', {
        input: {
          file_name: 'recording.wav',
          url: audioFile,
        },
        pollInterval: 1000,
        logs: true,
        onQueueUpdate(update) {
          setElapsedTime(Date.now() - start);
          if (
            update.status === 'IN_PROGRESS' ||
            update.status === 'COMPLETED'
          ) {
            setLogs((update.logs || []).map((log) => log.message));
          }
        },
      });
      setResult(result);
    } catch (error: any) {
      setError(error);
    } finally {
      setLoading(false);
      setElapsedTime(Date.now() - start);
    }
    // @snippet:end
  };
  return (
    <div className="min-h-screen dark:bg-gray-900 bg-gray-100">
      <main className="container dark:text-gray-50 text-gray-900 flex flex-col items-center justify-center w-full flex-1 py-10 space-y-8">
        <h1 className="text-4xl font-bold mb-8">
          Hello <code className="font-light text-pink-600">fal</code>
        </h1>
        {/* <div className="text-lg w-full">
          <label htmlFor="prompt" className="block mb-2 text-current">
            Image
          </label>
          <input
            className="w-full text-lg p-2 rounded bg-black/10 dark:bg-white/5 border border-black/20 dark:border-white/10"
            id="image_url"
            name="image_url"
            type="file"
            placeholder="Choose a file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="text-lg w-full">
          <label htmlFor="prompt" className="block mb-2 text-current">
            Prompt
          </label>
          <input
            className="w-full text-lg p-2 rounded bg-black/10 dark:bg-white/5 border border-black/20 dark:border-white/10"
            id="prompt"
            name="prompt"
            placeholder="Imagine..."
            value={prompt}
            autoComplete="off"
            onChange={(e) => setPrompt(e.target.value)}
            onBlur={(e) => setPrompt(e.target.value.trim())}
          />
        </div> */}

        <button
          onClick={async (e) => {
            e.preventDefault();
            const audioFile = await startRecording();
            transcribeAudio(audioFile);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg py-3 px-6 mx-auto rounded focus:outline-none focus:shadow-outline"
          disabled={loading}
        >
          {loading ? 'Transcribing...' : 'Transcribe'}
        </button>

        <Error error={error} />

        <div className="w-full flex flex-col space-y-4">
          <div className="mx-auto">
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.url} alt="" />
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-light">JSON Result</h3>
            <p className="text-sm text-current/80">
              {`Elapsed Time (seconds): ${(elapsedTime / 1000).toFixed(2)}`}
            </p>
            <pre className="text-sm bg-black/70 text-white/80 font-mono h-60 rounded whitespace-pre overflow-auto w-full">
              {result
                ? JSON.stringify(result, null, 2)
                : '// result pending...'}
            </pre>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-light">Logs</h3>
            <pre className="text-sm bg-black/70 text-white/80 font-mono h-60 rounded whitespace-pre overflow-auto w-full">
              {logs.filter(Boolean).join('\n')}
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}

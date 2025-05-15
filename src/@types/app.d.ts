declare module '*.png' {
  const src: string;
  export = src;
}

declare module '*.svg' {
  const src: string;
  export = src;
}

declare module 'react-unity-webgl' {
  interface UnityContextHookProps {
    loaderUrl: string;
    dataUrl: string;
    frameworkUrl: string;
    codeUrl: string;
  }

  interface UnityInstance {
    SendMessage(gameObjectName: string, methodName: string, value?: any): void;
    SetFullscreen(fullscreen: boolean): void;
    Quit(): Promise<void>;
  }

  function useUnityContext(props: UnityContextHookProps): {
    unityProvider: any;
    isLoaded: boolean;
    loadingProgression: number;
    unityInstance: UnityInstance | null;
    addEventListener: (eventName: string, callback: (...args: any[]) => void) => void;
    removeEventListener: (eventName: string, callback: (...args: any[]) => void) => void;
    sendMessage: (gameObjectName: string, methodName: string, parameter?: any) => void;
    takeScreenshot: (dataType?: string) => string | null;
    setFullscreen: (fullscreen: boolean) => void;
  };
}

export {}; 
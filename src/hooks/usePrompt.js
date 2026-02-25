import { useContext, useEffect } from "react";
import { UNSAFE_NavigationContext as NavigationContext } from "react-router-dom";

export function usePrompt(when, onBlock) {
  const navigator = useContext(NavigationContext).navigator;

  useEffect(() => {
    if (!when) return;

    const push = navigator.push;
    const replace = navigator.replace;

    navigator.push = (...args) => {
      onBlock(args[0], () => push.apply(navigator, args));
    };

    navigator.replace = (...args) => {
      onBlock(args[0], () => replace.apply(navigator, args));
    };

    return () => {
      navigator.push = push;
      navigator.replace = replace;
    };
  }, [when, onBlock, navigator]);
}

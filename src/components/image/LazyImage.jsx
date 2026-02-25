import { memo } from "react";

const LazyImage = memo(function LazyImage({
  src,
  alt,
  className,
  loading = "lazy",
  decoding = "async",
  fetchPriority = "low",
  ...rest
}) {
  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      className={className}
      {...rest}
    />
  );
});

export default LazyImage;

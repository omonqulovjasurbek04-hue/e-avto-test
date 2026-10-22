// hls.js ships its light build (no subtitles / alternate audio) without its own typings; the API is the same.
declare module "hls.js/light" {
  import Hls from "hls.js";
  export default Hls;
}

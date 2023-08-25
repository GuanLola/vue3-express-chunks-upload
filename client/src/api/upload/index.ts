import { request } from "@/utils/service";

class Upload {
  static getUploadedChunks(params?: any) {
    return request({
      url: "/get_uploaded_chunks",
      method: "get",
      params,
    });
  }

  static uploadChunk(data?: any) {
    return request({
      url: "/upload_chunk",
      method: "post",
      data,
    });
  }

  static mergeChunks(params?: any) {
    return request({
      url: "/merge_chunks",
      method: "get",
      params,
    });
  }
}

export { Upload };

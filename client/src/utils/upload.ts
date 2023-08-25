import SparkMD5 from "spark-md5";
import { Upload } from "@/api/upload/index";

interface FormDataInput {
  file: Blob;
  fileName: string;
}

// 通过文件流获取唯一标识md5
const getMd5ByFile = (file: File) => {
  // 通过正则获取文件后缀
  const reg = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  const suffix = reg ? reg[1] : "";

  return new Promise<{ md5: string; suffix: string }>((resolve) => {
    // 读取文件
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(file);

    fileReader.onload = (e) => {
      const buffer = e.target?.result;

      const spark = new SparkMD5.ArrayBuffer();
      spark.append(buffer);

      // 获取文件md5
      const md5 = spark.end();

      resolve({
        md5,
        suffix,
      });
    };
  });
};

const getUploadedChunks = async (params = {}) => {
  const res = await Upload.getUploadedChunks(params);
  return res;
};

// 获取文件的块数组
const getFileAllChunks = (file: File, md5: string, suffix: string) => {
  let chunkSize = 1 * 1024 * 1024;
  const maxCount = 100;
  console.log("file.size", file.size);
  let count = Math.ceil(file.size / chunkSize);
  console.log("count>>>", count);

  if (count > maxCount) {
    chunkSize = file.size / maxCount;
    count = maxCount;
  }

  let start = 0;

  const chunks = [];

  while (start < count) {
    const chunk = file.slice(start * chunkSize, (start + 1) * chunkSize);

    chunks.push({
      file: chunk,
      fileName: `${md5}_${start + 1}.${suffix}`,
    });

    start++;
  }

  return chunks;
};

const getFormData = (data: FormDataInput) => {
  const { file, fileName } = data;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", fileName);

  return formData;
};

const uploadChunk = async (formData: FormData) => {
  const res = await Upload.uploadChunk(formData);
  return res;
};

const mergeChunks = async (params = {}) => {
  const res = await Upload.mergeChunks(params);
  return res;
};

// 上传文件改变时函数
const onFileChangeHandler = async (file: File) => {
  // 获取文件唯一标识
  const { md5, suffix } = await getMd5ByFile(file);

  // 获取文件已经上传过的块
  const res = await getUploadedChunks({ md5, suffix });

  const { code, fileList, filePath, msg } = res;

  if (code === 200 && msg === "uploaded") {
    console.log("已经有了", filePath);
    return res;
  }

  // 给文件按块大小分成块，返回块数组
  const chunks = await getFileAllChunks(file, md5, suffix);

  console.log("chunks>>>", chunks);

  // 并发上传数
  const concurrentChunks = 3;
  const promises = [];

  while (chunks.length) {
    const requests = chunks
      .splice(0, concurrentChunks)
      .filter((v) => !fileList.includes(v.fileName))
      .map((chunk) => getFormData(chunk))
      .map((formData) => uploadChunk(formData));

    promises.push(Promise.all(requests));
  }

  await Promise.all(promises);

  // 请求合并
  await mergeChunks({ md5, suffix });
};

export { onFileChangeHandler };

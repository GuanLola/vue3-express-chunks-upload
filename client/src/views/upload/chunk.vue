<template>
  <div class="upload-container">
    <a-upload
      name="file"
      :showUploadList="false"
      :customRequest="customRequest"
    >
      <a-button>
        <upload-outlined></upload-outlined>
        上传
      </a-button>
    </a-upload>
  </div>
</template>

<style lang="scss" scoped>
.upload-container {
  background: #fbfbfd;
  background-size: 400% 400%;
  height: 100vh;
  width: 100wh;
  display: flex;
  justify-content: center;
  padding: 60px;
}
</style>

<script setup>
import { UploadOutlined } from "@ant-design/icons-vue";
import { onFileChangeHandler } from "@/utils/upload";

// 自定义上传
const customRequest = (data) => {
  onFileChangeHandler(data.file);
};
</script>

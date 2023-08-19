let express = require('express')
let fs = require('fs')
let multiparty = require('multiparty')

let app = express(),
    PORT = 5000,
    HOST = 'http://localhost',
    HOSTNAME = `${HOST}:${PORT}`;

const UPLOAD_DIR = `${__dirname}/upload`


app.all('*', (req, resp, next) => {
  // 设置允许跨域的域名,*代表允许任意域名跨域
  resp.header('Access-Control-Allow-Origin','http://localhost:5173');
  // 允许的header类型
  resp.header('Access-Control-Allow-Headers','*');
  // 跨域允许的请求方式
  resp.header('Access-Control-Allow-Methods','DELETE,PUT,POST,GET,OPTIONS');
  // 让options 尝试请求快速结束
  if(req.method.toLowerCase() == 'options') {
    resp.send(200);
  } else {
    next();
  }
})

// 获取已经上传完的切片
app.get('/get_uploaded_chunks', async (req, resp) => {
  try {
    // 获取参数md5、后缀suffix
    const { md5, suffix } = req.query
    // 文件的文件夹
    const foldPath = `${UPLOAD_DIR}/${md5}`
    // 文件夹里面的文件
    const filePath = `${foldPath}.${suffix}`
    // 文件名
    const fileName = `${md5}.${suffix}`
    let fileList = []
    const isFileExist = await fs.existsSync(filePath)
    // 已经上传过了
    if (isFileExist) {
      resp.send({
        code: 200,
        msg: 'uploaded',
        fileList,
        filePath: `${HOSTNAME}/${fileName}`
      })
      return
    }

    // 文件夹存在，代表有些块在里面，有些块还没上传完
    const isFoldExist = await fs.existsSync(foldPath)
    if (isFoldExist) {
      // 同步读取目录内容
      fileList = fs.readdirSync(foldPath)

      // 排序
      fileList = fileList.sort((a, b) => {
        let reg = /_(\d+)/

        return reg.exec(a)[1] - reg.exec(b)[1]
      })
      // 把已经传过的块返回给前端，下次就不要重复传了
      resp.send({
        code: 200,
        msg: 'success',
        fileList
      })

      return
    }

    // 如果既没有存在过文件，之前也没传过什么块，就返回200，fileList为空
    resp.send({
      code: 200,
      msg: 'success',
      fileList
    })

  } catch (err) {
    console.log('获取已经上传的切片报错：', err)
    // 错误返回400
    resp.send({
      code: 400,
      msg: 'fail'
    })
  }
})



// 解析formData数据
const multipartyFormData = (req) => {

  return new Promise(async (resolve, reject) => {
    new multiparty.Form().parse(req, (err, fields, files) => {
      if (err) {
        reject(err)
        return
      }

      resolve({
        fields,
        files
      })
    })
  })
}

// 写文件
const writeFile = (resp, path, file) => {
  try {
    const buffer = fs.readFileSync(file.path)
    fs.writeFile(path, buffer, function (err) {
      resp.send({
        code: 200,
        msg: 'success'
      })
    })
  } catch (err) {
    console.log('文件块写入失败：', err)
  }
}

// 上传切片
app.post('/upload_chunk', async(req, resp) => {
  try {
    let { fields, files } = await multipartyFormData(req)

    let file = (files.file && files.file[0]) || {},
        fileName = (fields.fileName && fields.fileName[0]) || '',
        path = '',
        isExists = false

    let md5 = /^([^_]+)_(\d+)/.exec(fileName)[1]

    path = `${UPLOAD_DIR}/${md5}`

    // 没有该文件的文件夹就新建一个文件夹放这个文件块
    !fs.existsSync(path) ? fs.mkdirSync(path) : null

    path = `${UPLOAD_DIR}/${md5}/${fileName}`

    // 如果已经存在这个文件就不用进行下面写文件的操作了
    isExists = await fs.existsSync(path)

    if (isExists) {
      resp.send({
        code: 200,
        msg: 'success'
      })
      return
    }

    // 给每个块写进去这个文件夹中
    writeFile(resp, path, file)

  } catch(err) {
    console.log('上传切片报错：', err)

    resp.send({
      code: 400,
      msg: 'fail'
    })
  }
})


// 合并切片
const mergeChunks = (md5) => {
  return new Promise(async (resolve, reject) => {
    let path = `${UPLOAD_DIR}/${md5}`,
        fileList = [],
        suffix,
        isExists;
    
    // 切片是否存在
    isExists = await fs.existsSync(path)

    if (!isExists) {
      reject('md5 path is not found')
      return
    }

    // 读取文件夹，返回该文件夹下所有文件名数组
    fileList = fs.readdirSync(path)

    // 文件名后面_序号进行排序
    const newFileList = fileList.sort((a, b) => {
      let reg = /_(\d+)/
      return reg.exec(a)[1] - reg.exec(b)[1]
    })

    newFileList.forEach(item => {
      !suffix ? suffix = /\.([0-9a-zA-Z]+)$/.exec(item)[1] : null
      
      // 向 upload/md5 文件追加该文件内容 
      fs.appendFileSync(`${UPLOAD_DIR}/${md5}.${suffix}`, fs.readFileSync(`${path}/${item}`))

      // 追加完后删掉该文件内容
      fs.unlinkSync(`${path}/${item}`)
    })

    // 全部完成后删除该md5文件夹
    fs.rmdirSync(path)

    resolve({
      path: `${UPLOAD_DIR}/${md5}.${suffix}`,
      fileName: `${md5}.${suffix}`
    })
  })
}

// 合并切片
app.get('/merge_chunks', async (req, resp) => {
  let { md5 } = req.query

  try {
    let { fileName, path } = await mergeChunks(md5)

    resp.send({
      code: 200,
      msg: 'success',
      filePath: `${HOSTNAME}/${fileName}`
    })
  } catch (err) {
      console.log('切片合并失败:', err)
      resp.send({
        code: 400,
        msg: 'fail'
      })
  }
})


app.listen(PORT, () => {
  console.log(`服务器在端口 ${PORT} 启动~`)
})
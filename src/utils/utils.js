
export const downLoadJsonFile = (fileName, json) => {
  const jsonStr = (json instanceof Object) ? JSON.stringify(json) : json;
  var textFileAsBlob = new Blob([jsonStr]);
  var downloadLink = document.createElement("a");
  downloadLink.download = fileName;
  downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
  downloadLink.click();
}
export const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

// 时间戳格式转换
export function timecodeFormat(_timecode) {
  const date = new Date(_timecode)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const formattedData = `${year}-${month}-${day}`
  return formattedData
}

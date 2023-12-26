
async function fetchWithTimeout(url, { timeout = 1000 } = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { signal: controller.signal })
    .then(response => {
      clearTimeout(id);
      return response;
    })
    .catch(error => {
      clearTimeout(id);
      throw error;
    });
}
// 测试网站地址的函数
export async function testStatus2(_url, _timeout) {
  try {
    const response = await fetchWithTimeout(_url, { timeout: _timeout });
    const data = await response.text();
    // console.log('成功获取数据：', data);
    return response.ok;
  } catch (error) {
    if (error.name === 'AbortError') {
      // console.warn('请求超时！');
    } else {
      // console.error('发生错误：', error);
    }
    return false;
  }
}

// 测试网站地址的函数
export async function testStatus(_url) {
  try {
    const response = await fetch(_url);
    // console.log(`${_url} - 状态码: ${response.status}，状态信息: ${response.statusText}`);
    return response.ok;
  } catch (error) {
    // console.error(`${_url} - 错误: ${error.message}`);
    return false;
  }
}

// 超时检测
export async function testTimeout(url) {
  try {
    const response = await fetch(url, { timeout: 1000 }); // 设置超时时间为5秒
    return response.ok;
  } catch (error) {
    // console.error(`${url} - 错误: ${error.message}`);
    return false;
  }
}

// 网络错误检测
export async function testNetworkError(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch (error) {
    // console.error(`${url} - 错误: ${error.message}`);
    return false;
  }
}

// 内容验证
export async function testContentValidation(url, expectedContent) {
  try {
    const response = await fetch(url);
    const text = await response.text();
    // console.info('--> testContentValidation ',text)
    return text.includes(expectedContent);
  } catch (error) {
    // console.error(`${url} - 错误: ${error.message}`);
    return false;
  }
}

// DNS 解析问题检测
// const dns = require('dns');
import dns from 'dns'
export async function testDNSResolution(url) {
  try {
    const domain = new URL(url).hostname;
    await dns.promises.resolve(domain);
    return true;
  } catch (error) {
    // console.error(`${url} - 错误: ${error.message}`);
    return false;
  }
}

// 服务端错误检测
export async function testServerError(url) {
  try {
    const response = await fetch(url);
    return response.status >= 500 && response.status < 600;
  } catch (error) {
    // console.error(`${url} - 错误: ${error.message}`);
    return false;
  }
}

// 重定向检测
export async function testRedirect(url) {
  try {
    const response = await fetch(url, { redirect: 'manual' }); // 防止自动重定向
    return response.redirected;
  } catch (error) {
    // console.error(`${url} - 错误: ${error.message}`);
    return false;
  }
}

// 证书问题检测
import tls from 'tls'
export async function testCertificateError(url) {
  try {
    const domain = new URL(url).hostname;
    const options = { servername: domain, rejectUnauthorized: true };
    await tls.connect(443, domain, options);
    return true;
  } catch (error) {
    // console.error(`${url} - 错误: ${error.message}`);
    return false;
  }
}

// 内容更改检测
export async function testContentChange(url, previousContent) {
  try {
    const response = await fetch(url);
    const text = await response.text();
    return text !== previousContent;
  } catch (error) {
    // console.error(`${url} - 错误: ${error.message}`);
    return false;
  }
}

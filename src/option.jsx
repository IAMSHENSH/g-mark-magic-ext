import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './option.css'
import * as websidetest from './utils/websidetest.js'
import * as utils from './utils/utils.js'
import ImageLogo from "./assets/logo_v.png"
import { AutoSizer, List } from 'react-virtualized';
import 'react-virtualized/styles.css'; // only needs to be imported once

// 获取标签数据的书签，返回书签数组
const getBookMarksList = (_data, _parentTitle) => {
  let bookmarkList = []
  for (let i = 0; i < _data.length; i++) {
    const element = _data[i];
    // 根据 url 来判断是否目录
    if (element.url) {
      const addedString = utils.timecodeFormat(element.dateAdded)
      const lastUsedString = element.dateLastUsed ? utils.timecodeFormat(element.dateLastUsed) : ''
      bookmarkList.push({
        title: element.title,
        url: element.url,
        added: element.dateAdded,
        addedString: addedString,
        lastUsed: element.dateLastUsed,
        lastUsedString: lastUsedString,
        id: element.id,
        status: -1,
        parents: [..._parentTitle]
      })
    } else {
      // 是目录
      let childrenCatalog = getBookMarksList(element.children, [..._parentTitle, element.title])
      bookmarkList.push(...childrenCatalog)
    }
  }
  return bookmarkList
}

const getBookMarksMap = (_data) => {
  let bookmarkMap = {}
  for (let i = 0; i < _data.length; i++) {
    const element = _data[i];
    // 根据 url 来判断是否目录
    if (element.url) {
      const addedString = utils.timecodeFormat(element.added)
      const lastUsedString = element.lastUsed ? utils.timecodeFormat(element.lastUsed) : ''
      bookmarkMap[element.id] = {
        title: element.title,
        url: element.url,
        added: element.added,
        addedString: addedString,
        lastUsed: element.lastUsed,
        lastUsedString: lastUsedString,
        id: element.id,
        // status : 默认 -1 ,不可连接 0， 可连接 1， 超时： 2，内容不对： 3
        status: element.status
      }
    } else {
      // 是目录
      let childrenCatalog = getBookMarksMap(element.children)
      for (const key in childrenCatalog) {
        if (Object.hasOwnProperty.call(childrenCatalog, key)) {
          const element = childrenCatalog[key];
          bookmarkMap[key] = element
        }
      }
    }
  }
  return bookmarkMap
}

const WebSideStatusCheck = () => {
  // 用户原始数组，避免排序显示弄坏
  const [originMarkList, setOriginMarkList] = useState([])
  // 组件显示数组
  const [bookmarkList, setBookmarkList] = useState([])
  const [warnBookmarkList, setWarnBookmarkList] = useState([])
  // 清晰状态信息
  const [taskStatus, setTaskStatus] = useState({
    completeNum: 0,
    warnUrlNum: 0,
  })

  async function checkURL(_webside, _timelimit = 5000) {
    let webside = structuredClone(_webside)
    // URL 状态检查的超时时间
    const g_url_timeout = _timelimit
    return new Promise(async (resolve) => {
      const isAlive = await websidetest.testStatus2(webside.url, g_url_timeout)
      webside.status = isAlive ? 1 : 0
      resolve(webside);
    });
  }


  async function performCheck(_maxConcurrentTasks = 8) {

    const maxConcurrentTasks = _maxConcurrentTasks

    let bookmarkArr = structuredClone(originMarkList)
    let nextWarnBookmarkList = structuredClone(originMarkList)

    let warnUrlNum = 0, completeNum = 0
    console.log('--> onCheckTask', bookmarkArr);
    let nextBookMark = []
    for (let i = 0; i < bookmarkArr.length; i++) {
      const element = bookmarkArr[i]
      if (element.status === -1) {
        const task = checkURL(element, 1000 * 10).then((result) => {
          const index = bookmarkArr.findIndex((item) => item.id === result.id);
          if (index !== -1) {
            bookmarkArr[index].status = result.status;
            const nextBookmarkArr = structuredClone(bookmarkArr)
            setBookmarkList(nextBookmarkArr)
            if (result.status !== 1) {
              warnUrlNum++
              const indexWarn = nextWarnBookmarkList.findIndex((item) => item.id === result.id);
              nextWarnBookmarkList[indexWarn].status = result.status;
            } else {
              const temp = nextWarnBookmarkList.filter(item => {
                return item.id !== result.id
              })
              nextWarnBookmarkList = temp
            }
            setWarnBookmarkList(nextWarnBookmarkList)
            completeNum++
            setTaskStatus({
              ...taskStatus,
              warnUrlNum: warnUrlNum,
              completeNum: completeNum
            })
          }
          nextBookMark.push(result)
        })
        inProgress.push(task);
        if (inProgress.length >= maxConcurrentTasks || i === bookmarkArr.length - 1) {
          await Promise.all(inProgress);
          nextBookMark = []
          inProgress.length = 0
        }
      }

    }
    const bookmarkMap = getBookMarksMap(bookmarkArr)
    chrome.storage.local.set({ mm_mark_map: bookmarkMap }, function () {
      console.log('--> bg: mm_mark_map Data saved. ', bookmarkArr, bookmarkMap);
    });
  }
  // 从尾到头，快速标签能连接的。双向安全检查
  async function performCheckFast() {
    let bookmarkArr = structuredClone(originMarkList)
    let nextWarnBookmarkList = structuredClone(originMarkList)
    let warnUrlNum = 0, completeNum = 0
    const timeout = 1000 * 10
    // for (let i = bookmarkList.length - 1; i >= 0; i--) {
    for (let i = 0; i < bookmarkArr.length; i++) {
      checkURL(bookmarkArr[i], timeout).then((result) => {
        const index = bookmarkArr.findIndex((item) => item.id === result.id);
        if (index !== -1) {
          // 快速检查结果不精准，供参考，将 0 -> 3
          if (result.status === 0) {
            result.status = 3
          }
          // if (result.status !== 0) {
          bookmarkArr[index].status = result.status;
          const nextBookmarkArr = structuredClone(bookmarkArr)
          setBookmarkList(nextBookmarkArr)
          if (result.status !== 1) {
            warnUrlNum++
            const indexWarn = nextWarnBookmarkList.findIndex((item) => item.id === result.id);
            nextWarnBookmarkList[indexWarn].status = result.status;
          } else {
            const temp = nextWarnBookmarkList.filter(item => {
              return item.id !== result.id
            })
            nextWarnBookmarkList = temp
          }
          setWarnBookmarkList(nextWarnBookmarkList)
          completeNum++
          setTaskStatus({
            ...taskStatus,
            warnUrlNum: warnUrlNum,
            completeNum: completeNum
          })
          // }
        }
      })
    }

    setTimeout(async () => {
      // 一定时间后检查是否还有未完成的，处理它
      console.info('--> timeeeeout')
      for (let i = 0; i < bookmarkArr.length; i++) {
        const element = bookmarkArr[i];
        if (element.status === -1) {
          await checkURL(bookmarkArr[i], timeout).then((result) => {
            const index = bookmarkArr.findIndex((item) => item.id === result.id);
            if (index !== -1) {
              // if (result.status !== 0) {
              bookmarkArr[index].status = result.status;
              const nextBookmarkArr = structuredClone(bookmarkArr)
              setBookmarkList(nextBookmarkArr)
              if (result.status !== 1) {
                warnUrlNum++
                const indexWarn = nextWarnBookmarkList.findIndex((item) => item.id === result.id);
                nextWarnBookmarkList[indexWarn].status = result.status;
                setWarnBookmarkList(nextWarnBookmarkList)
              } else {
                const temp = nextWarnBookmarkList.filter(item => {
                  return item.id !== result.id
                })
                nextWarnBookmarkList = temp
                setWarnBookmarkList(nextWarnBookmarkList)
              }
              completeNum++
              setTaskStatus({
                ...taskStatus,
                warnUrlNum: warnUrlNum,
                completeNum: completeNum
              })
              // }
            }
          })
        }
      }

      const bookmarkMap = getBookMarksMap(bookmarkArr)
      chrome.storage.local.set({ mm_mark_map: bookmarkMap }, function () {
        console.log('--> bg: mm_mark_map Data saved. ', bookmarkArr, bookmarkMap);
      });
    }, timeout + 1000 * 5);
  }

  async function onDetailedCheckTask() {
    // 更改状态
    setTaskStatus({
      ...taskStatus,
      completeNum: 1
    })
    // 执行并发检查
    performCheck(16)
      .then(() => {
        console.log('URL 检查完成！');
      })
      .catch((err) => {
        console.error('检查过程出错：', err);
      });

    // 疯狂模式检查
    // performCheckFast()
  }

  async function onFastCheckTask() {
    // 更改状态
    setTaskStatus({
      ...taskStatus,
      completeNum: 1
    })
    // 疯狂模式检查
    performCheckFast()
  }
  function onSortByAdded() {
    let bookmarkListTemp = JSON.parse(JSON.stringify(warnBookmarkList))
    bookmarkListTemp.sort((x, y) => {
      return y.added - x.added
    })
    setWarnBookmarkList(bookmarkListTemp)
  }
  function onSortByUsed() {
    // 需要清洗掉没有打开过的
    let bookmarkListTemp = [], bookmarkListElse = []
    for (let i = 0; i < warnBookmarkList.length; i++) {
      if (warnBookmarkList[i].lastUsed) {
        bookmarkListTemp.push(warnBookmarkList[i])
      } else {
        bookmarkListElse.push(warnBookmarkList[i])
      }
    }
    bookmarkListTemp.sort((x, y) => {
      return y.lastUsed - x.lastUsed
    })
    bookmarkListElse.sort((x, y) => {
      return y.added - x.added
    })
    bookmarkListTemp.push(...bookmarkListElse)
    setWarnBookmarkList(bookmarkListTemp)
  }

  function onMarkDel(_mark) {
    // 删除书签
    chrome.bookmarks.remove(_mark.id, (item) => {
      // 删除成功，刷新列表
      let bookmarkListTemp = []
      for (let i = 0; i < warnBookmarkList.length; i++) {
        if (warnBookmarkList[i].id !== _mark.id) {
          bookmarkListTemp.push(warnBookmarkList[i])
        }
      }
      setWarnBookmarkList(bookmarkListTemp)
    })

  }
  async function onMarkFile(_mark) {
    // 如果没有回收站着创建
    //  搜索一下有没有，可能有多个，放到第一个
    let searchResult = await chrome.bookmarks.search({ title: 'MarkMagicFile' });
    // console.info('--> searchResult : ', searchResult)
    if (searchResult.length === 0) {
      // 形成新目录
      const magicBookMarkRoot = await chrome.bookmarks.create({
        title: 'MarkMagicFile',
      });
      searchResult.push(magicBookMarkRoot)
    }
    const moveResult = await chrome.bookmarks.move(_mark.id, {
      parentId: searchResult[0].id
    });
  }


  function rowRenderer({
    key, // Unique key within array of rows
    index, // Index of row within collection
    style, // Style object to be applied to row (to position it)
  }) {
    return (

      <div key={key} className="flex justify-between gap-x-6 px-1 py-2 rounded-md hover:bg-slate-100" style={style}>
        <div className="flex min-w-0 gap-x-4">
          {/* <img className="h-12 w-12 flex-none rounded-full bg-gray-50" src={person.imageUrl} alt="" /> */}
          <div
            className="flex flex-col justify-center rounded-full bg-emerald-500/20 p-1 cursor-pointer"
            onClick={() => { chrome.tabs.create({ url: warnBookmarkList[index].url }) }}>
            {warnBookmarkList[index].status === -1 ? (
              <div className="h-2 w-2 rounded-full bg-gray-500" />
            ) : ''}
            {warnBookmarkList[index].status === 0 ? (
              <div className="h-2 w-2 rounded-full bg-red-500" />
            ) : ''}
            {warnBookmarkList[index].status === 1 ? (
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
            ) : ''}
            {warnBookmarkList[index].status === 3 ? (
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
            ) : ''}
          </div>
          <div className="min-w-0 flex-auto">
            <p className="text-sm font-semibold leading-6 text-gray-900 truncate cursor-pointer"
              title={warnBookmarkList[index].title}
              onClick={() => { chrome.tabs.create({ url: warnBookmarkList[index].url }) }}
            >{warnBookmarkList[index].title}</p>
            <p className="mt-1 text-xs leading-5 text-gray-500 truncate "
              title={warnBookmarkList[index].url}>{warnBookmarkList[index].url}</p>
          </div>
        </div>
        <div className="hidden shrink-0 sm:flex sm:flex-col sm:items-end">
          <div>
            <p className="text-sm leading-6 text-gray-900">Added {warnBookmarkList[index].addedString}</p>
          </div>
          <div className='flex items-center'>
            {!warnBookmarkList[index].lastUsed ? (
              <p className="mt-1 text-xs leading-5 text-gray-500">
                <span >{warnBookmarkList[index].lastUsedString}</span>
              </p>
            ) : (
              <div className="flex items-center gap-x-1.5">
                <div className="flex-none rounded-full bg-emerald-500/20 p-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </div>
                <p className="text-xs leading-5 text-gray-500">LastUsed {warnBookmarkList[index].lastUsedString}</p>
              </div>
            )}
            <button className='mx-1 rounded-md bg-gray-300 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600'
              onClick={() => { onMarkFile(warnBookmarkList[index]) }}
            >FILE</button>
            <button className='mx-1 rounded-md bg-red-300 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600'
              onClick={() => { onMarkDel(warnBookmarkList[index]) }}
            >DEL</button>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    chrome.bookmarks.getTree(function (bookmarkArray) {
      const bookmarkArr = getBookMarksList(bookmarkArray, [])
      console.log(bookmarkArr);
      setOriginMarkList(bookmarkArr)
      setBookmarkList(bookmarkArr)
      setWarnBookmarkList(bookmarkArr)
    })
  }, []);

  return (
    <>

      <div className='flex items-center justify-between mb-2'>
        <div className='flex'>
          <label className="block text-lg font-medium leading-6 text-gray-900">
            BookMarks Clear Up
          </label>
        </div>
        <div className='flex items-center'>
          {
            (taskStatus.completeNum === 0 || taskStatus.completeNum >= bookmarkList.length) ? '' :
              <>
                <div className="w-40 h-2 mx-4 rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-sky-300" style={{ width: `${(taskStatus.completeNum / bookmarkList.length * 100).toFixed(2)}%` }}></div>
                </div>
                <span className="inline-flex items-center rounded-md bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-600 ring-1 ring-inset ring-cyan-500/10">
                  {taskStatus.completeNum} / {bookmarkList.length} ({(taskStatus.completeNum / bookmarkList.length * 100).toFixed(2)}% )
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" dataSlot="icon" className="motion-reduce:hidden animate-spin w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                  </svg>
                </span>
              </>
          }
          {
            !(taskStatus.completeNum === 0 || taskStatus.completeNum >= bookmarkList.length) ? '' :
              <>
                <button
                  className='mx-1 rounded-md bg-green-600 px-1.5 py-0.5 font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600'
                  onClick={onFastCheckTask}>FastCheck(Trial)</button>
                <button
                  className='mx-1 rounded-md bg-green-600 px-1.5 py-0.5 font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600'
                  onClick={onDetailedCheckTask}>DetailedCheck</button>
              </>
          }
        </div>
      </div>
      <div className='flex flex-wrap m-2'>
        {bookmarkList.map((markItem) => (
          <>
            {markItem.status === -1 ? (
              <span title={markItem.title} className='bg-slate-300 me-0.5 mb-0.5 w-4 h-4 hover:border-2 hover:border-indigo-500/75 cursor-pointer'
                onClick={() => { chrome.tabs.create({ url: markItem.url }) }}></span>
            ) : ''}
            {markItem.status === 0 ? (
              <span title={markItem.title} className='bg-red-500 me-0.5 mb-0.5 w-4 h-4 hover:border-2 hover:border-indigo-500/75 cursor-pointer'
                onClick={() => { chrome.tabs.create({ url: markItem.url }) }}></span>
            ) : ''}
            {markItem.status === 1 ? (
              <span title={markItem.title} className='bg-emerald-500 me-0.5 mb-0.5 w-4 h-4 hover:border-2 hover:border-indigo-500/75 cursor-pointer'
                onClick={() => { chrome.tabs.create({ url: markItem.url }) }}></span>
            ) : ''}
            {markItem.status === 3 ? (
              <span title={markItem.title} className='bg-yellow-500 me-0.5 mb-0.5 w-4 h-4 hover:border-2 hover:border-indigo-500/75 cursor-pointer'
                onClick={() => { chrome.tabs.create({ url: markItem.url }) }}></span>
            ) : ''}
          </>

        ))}
      </div>
      <div className="flex mt-1 items-center justify-between">
        <div></div>
        <div className='flex'>
          <span className="inline-flex items-center rounded-md bg-yellow-50 ml-1 px-2 py-1 text-xs font-medium text-yellow-600 ring-1 ring-inset ring-yellow-500/10">
            Warn Urls: {taskStatus.warnUrlNum}
          </span>
          <button className='mx-1 rounded-md bg-orange-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600'
            onClick={onSortByAdded}
          >ByAdded</button>
          <button className='mx-1 rounded-md bg-amber-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm hover:bg-amber-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600'
            onClick={onSortByUsed}
          >ByUsed</button>
        </div>
      </div>
      <div className="mt-1" style={{ height: 400 }}>
        <AutoSizer>
          {({ height, width }) => (
            <List
              width={width}
              height={height}
              rowCount={warnBookmarkList.length}
              rowHeight={64}
              overscanRowCount={9}
              rowRenderer={rowRenderer}
            />
          )}
        </AutoSizer>
      </div>

    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div className='flex justify-center mt-4'>
      <img src={ImageLogo} className="w-48" alt="MarkMagic logo" />
    </div>
    <section className='mx-3 my-4 px-2 py-2 border-solid border-2 rounded-md shadow bg-slate-50'>
      <WebSideStatusCheck />
    </section>
  </React.StrictMode>,
)

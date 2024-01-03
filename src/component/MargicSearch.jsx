import { useState, useEffect } from "react";
import * as utils from "../utils/utils.js";
import * as websidetest from "../utils/websidetest.js";

function MargicSearch() {
  const [searchInput, setSearchInput] = useState("");
  // 用户原始数组，避免排序显示弄坏
  const [originMarkList, setOriginMarkList] = useState([]);
  const [originMarkMap, setOriginMarkMap] = useState({});
  // 组件显示数组
  const [bookmarkList, setBookmarkList] = useState([]);
  // 连接状态地址
  const [statusCheckNum, setStatusCheckNum] = useState(0);

  // 获取标签数据的书签，返回书签数组
  const getBookMarksList = (_data) => {
    let bookmarkList = [];
    for (let i = 0; i < _data.length; i++) {
      const element = _data[i];
      // 根据 url 来判断是否目录
      if (element.url) {
        if (!element.url.startsWith("edge://")){
          const addedString = utils.timecodeFormat(element.dateAdded);
          const lastUsedString = element.dateLastUsed
            ? utils.timecodeFormat(element.dateLastUsed)
            : "";
          bookmarkList.push({
            title: element.title,
            url: element.url,
            added: element.dateAdded,
            addedString: addedString,
            lastUsed: element.dateLastUsed,
            lastUsedString: lastUsedString,
            id: element.id,
            status: -1,
          });
        }
      } else {
        // 是目录
        let childrenCatalog = getBookMarksList(element.children);
        bookmarkList.push(...childrenCatalog);
      }
    }
    return bookmarkList;
  };

  const getBookMarksMap = (_data) => {
    let bookmarkMap = {};
    for (let i = 0; i < _data.length; i++) {
      const element = _data[i];
      // 根据 url 来判断是否目录
      if (element.url) {
        if (!element.url.startsWith("edge://")){
          const addedString = utils.timecodeFormat(element.dateAdded);
          const lastUsedString = element.dateLastUsed
            ? utils.timecodeFormat(element.dateLastUsed)
            : "";
          bookmarkMap[element.id] = {
            title: element.title,
            url: element.url,
            added: element.dateAdded,
            addedString: addedString,
            lastUsed: element.dateLastUsed,
            lastUsedString: lastUsedString,
            id: element.id,
            // status : 默认 -1 ,不可连接 0， 可连接 1， 超时： 2，内容不对： 3
            status: -1,
          };
        }
      } else {
        // 是目录
        let childrenCatalog = getBookMarksMap(element.children);
        for (const key in childrenCatalog) {
          if (Object.hasOwnProperty.call(childrenCatalog, key)) {
            const element = childrenCatalog[key];
            bookmarkMap[key] = element;
          }
        }
      }
    }
    return bookmarkMap;
  };

  function onSearch() {
    // console.info('--> MargicSearch : onSearch ', searchInput)
    const tempList = JSON.parse(JSON.stringify(originMarkList));
    const res = tempList.filter((obj) => {
      return Object.values(obj).some((val) => {
        if (typeof val === "string") {
          return val.includes(searchInput);
        }
      });
    });
    // console.log('onSearch', res);
    setBookmarkList(res);
  }

  const readLocalStorage = async (key) => {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], function (result) {
          if (result[key] === "undefined") {
            reject();
          } else {
            resolve(result[key]);
          }
        });
      });
  };

  // URL 状态检查的超时时间
  const g_url_timeout = 5000;

  async function onLoad() {
    // 获取所有书签树结构
    chrome.bookmarks.getTree(async function (bookmarkArray) {
      // console.log(bookmarkArray);
      const bookmarkArr = getBookMarksList(bookmarkArray);
      const bookmarkMap = getBookMarksMap(bookmarkArray);

      const mm_mark_map = await readLocalStorage("mm_mark_map");
      if (mm_mark_map) {
        const markMap = mm_mark_map;
        // 更新到列表
        let nextMarkList = bookmarkArr.map((item) => {
          return {
            ...item,
            status: markMap[item.id] ? markMap[item.id].status : -1,
          };
        });
        setBookmarkList(nextMarkList);
        setOriginMarkList(nextMarkList);
      } else {
        setBookmarkList(bookmarkArr);
        setOriginMarkList(bookmarkArr);
      }
      setOriginMarkMap(bookmarkMap);
    });
  }

  function onSortByAdded() {
    let bookmarkListTemp = JSON.parse(JSON.stringify(originMarkList));

    if (searchInput) {
      // 进行搜索
      const searchResult = bookmarkListTemp.filter((obj) => {
        return Object.values(obj).some((val) => {
          if (typeof val === "string") {
            return val.includes(searchInput);
          }
        });
      });

      // 进行排序
      searchResult.sort((x, y) => {
        return y.added - x.added;
      });

      // 更新结果
      setBookmarkList(searchResult);
    } else {
      // 不进行搜索，直接排序原始书签列表
      bookmarkListTemp.sort((x, y) => {
        return y.added - x.added;
      });

      // 更新结果
      setBookmarkList(bookmarkListTemp);
    }
  }

  function onSortByUsed() {
    // 需要清洗掉没有打开过的
    let bookmarkListTemp = [];
    for (let i = 0; i < originMarkList.length; i++) {
      if (originMarkList[i].lastUsed) {
        bookmarkListTemp.push(originMarkList[i]);
      }
    }
    bookmarkListTemp.sort((x, y) => {
      return y.lastUsed - x.lastUsed;
    });
    setBookmarkList(bookmarkListTemp);
  }

  function onSelectStatus(_status) {
    let bookmarkListTemp = [];
    for (let i = 0; i < originMarkList.length; i++) {
      if (originMarkList[i].status === _status) {
        bookmarkListTemp.push(originMarkList[i]);
      }
    }
    setBookmarkList(bookmarkListTemp);
  }

  function onMarkDel(_mark) {
    // 删除书签
    // remove()
    chrome.bookmarks.remove(_mark.id, (item) => {
      // 删除成功，刷新列表
      let bookmarkListTemp = [];
      for (let i = 0; i < bookmarkList.length; i++) {
        if (bookmarkList[i].id !== _mark.id) {
          bookmarkListTemp.push(bookmarkList[i]);
        }
      }
      setBookmarkList(bookmarkListTemp);
    });
  }

  async function onMarkFile(_mark) {
    let searchResult = await chrome.bookmarks.search({
      title: "MarkMagicFile",
    });
    if (searchResult.length === 0) {
      // 形成新目录
      const magicBookMarkRoot = await chrome.bookmarks.create({
        title: "MarkMagicFile",
      });
      searchResult.push(magicBookMarkRoot);
    }
    const moveResult = await chrome.bookmarks.move(_mark.id, {
      parentId: searchResult[0].id,
    });
  }

  // 验证是否失效
  async function onIsAliveCheck() {
    setStatusCheckNum(1);
    let booksMarkMap = structuredClone(originMarkMap);
    for (let i = 0; i < originMarkList.length; i++) {
      setStatusCheckNum(i + 1);
      const element = originMarkList[i];
      const isAlive = await websidetest.testStatus2(element.url, g_url_timeout);
      booksMarkMap[element.id].status = isAlive ? 1 : 0;
      if (isAlive) {
        const isRight = await websidetest.testContentValidation(
          element.url,
          element.title
        );
        booksMarkMap[element.id].status = isRight ? 1 : 3;
      }
    }
    setStatusCheckNum(0);
    chrome.storage.local.set({ mm_mark_map: booksMarkMap }, function () {});
    // 更新到列表
    let nextMarkList = bookmarkList.map((item) => {
      return {
        ...item,
        status: booksMarkMap[item.id] ? booksMarkMap[item.id].status : -1,
      };
    });
    setBookmarkList(nextMarkList);
  }

  useEffect(() => {
    onLoad();
  }, []);
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex">
          <label className="block text-sm font-medium leading-6 text-gray-900">
            {/* MargicSearch */}
            BookMarksNumber
          </label>
          {!bookmarkList.length ? (
            ""
          ) : (
            <span className="ms-1 items-center rounded-md bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-500/10">
              {bookmarkList.length}
            </span>
          )}
        </div>
        <div className="flex">
          <button
            className="mx-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            onClick={onSearch}
          >
            SEARCH
          </button>
          {statusCheckNum ? (
            ""
          ) : (
            <button
              className="mx-1 rounded-md bg-cyan-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
              onClick={onIsAliveCheck}
            >
              CHECK
            </button>
          )}
          {!statusCheckNum ? (
            ""
          ) : (
            <span className="inline-flex items-center rounded-md bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-600 ring-1 ring-inset ring-cyan-500/10">
              {statusCheckNum} / {originMarkList.length} (
              {((statusCheckNum / originMarkList.length) * 100).toFixed(2)}% )
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1}
                stroke="currentColor"
                dataSlot="icon"
                className="motion-reduce:hidden animate-spin w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                />
              </svg>
            </span>
          )}
        </div>
      </div>
      <div className="mt-1">
        <input
          type="text"
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
          }}
        />
      </div>
      <div className="flex mt-1 items-center justify-between">
        <div></div>
        <div className="flex">
          <button
            className="mx-1 rounded-md bg-orange-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
            onClick={onSortByAdded}
          >
            ByAdded
          </button>
          <button
            className="mx-1 rounded-md bg-amber-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm hover:bg-amber-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
            onClick={onSortByUsed}
          >
            ByUsed
          </button>
          <button
            className="mx-1 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            onClick={() => {
              onSelectStatus(1);
            }}
          ></button>
          <button
            className="mx-1 rounded-md bg-yellow-600 px-2 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-yellow-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
            onClick={() => {
              onSelectStatus(3);
            }}
          ></button>
          <button
            className="mx-1 rounded-md bg-red-600 px-2 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            onClick={() => {
              onSelectStatus(0);
            }}
          ></button>
        </div>
      </div>
      <ul role="list" className="mt-1 divide-y divide-gray-100">
        {bookmarkList.map((markItem) => (
          <li
            key={markItem.id}
            className="flex justify-between gap-x-6 px-1 py-2 rounded-md hover:bg-slate-100"
          >
            <div className="flex min-w-0 gap-x-4">
              <div
                className="flex flex-col justify-center rounded-full bg-emerald-500/20 p-1 cursor-pointer"
                onClick={() => {
                  chrome.tabs.create({ url: markItem.url });
                }}
              >
                {markItem.status === -1 ? (
                  <div className="h-2 w-2 rounded-full bg-gray-500" />
                ) : (
                  ""
                )}
                {markItem.status === 0 ? (
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                ) : (
                  ""
                )}
                {markItem.status === 1 ? (
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                ) : (
                  ""
                )}
                {markItem.status === 3 ? (
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                ) : (
                  ""
                )}
              </div>
              <div className="min-w-0 flex-auto">
                <p
                  className="text-sm font-semibold leading-6 text-gray-900 truncate cursor-pointer"
                  title={markItem.title}
                  onClick={() => {
                    chrome.tabs.create({ url: markItem.url });
                  }}
                >
                  {markItem.title}
                </p>
                <p
                  className="mt-1 text-xs leading-5 text-gray-500 truncate "
                  title={markItem.url}
                >
                  {markItem.url}
                </p>
              </div>
            </div>
            <div className="hidden shrink-0 sm:flex sm:flex-col sm:items-end">
              <div>
                <p className="text-sm leading-6 text-gray-900">
                  Added {markItem.addedString}
                </p>
              </div>
              <div className="flex items-center">
                {!markItem.lastUsed ? (
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    <span>{markItem.lastUsedString}</span>
                  </p>
                ) : (
                  <div className="flex items-center gap-x-1.5">
                    <div className="flex-none rounded-full bg-emerald-500/20 p-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <p className="text-xs leading-5 text-gray-500">
                      LastUsed {markItem.lastUsedString}
                    </p>
                  </div>
                )}
                {/* {
                  <p>{markItem.aidistance}</p>
                } */}
                <button
                  className="mx-1 rounded-md bg-gray-300 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
                  onClick={() => {
                    onMarkFile(markItem);
                  }}
                >
                  FILE
                </button>
                <button
                  className="mx-1 rounded-md bg-red-300 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                  onClick={() => {
                    onMarkDel(markItem);
                  }}
                >
                  DEL
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
export default MargicSearch;

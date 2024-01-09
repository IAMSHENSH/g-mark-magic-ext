import React from 'react'
import ReactDOM from 'react-dom/client'
import './sidepanel.css'
import ImageLogo from "./assets/logo_v.png"
import MargicSearch from './component/MargicSearch.jsx'

console.info('--> INIT SIDE PANEL')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div className='flex justify-center mt-2'>
      <img src={ImageLogo} className="w-48" alt="MarkMagic logo" />
    </div>
    <section className='mx-3 my-4 px-2 py-2 border-solid border-2 rounded-md shadow'>
      <MargicSearch />
    </section>
    <section className='mx-3 px-1 flex justify-center '>
      <div>
        @2023 Sean
      </div>
    </section>
  </React.StrictMode>
)

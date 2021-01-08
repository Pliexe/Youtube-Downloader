import { createRef, useState } from 'react';
import './App.css';
import Spinner from 'react-spinkit';

interface IMessage {
  title: string;
  message: string;
}

interface IVIdeoInfo {
  formats: {
    qualityLabel: string;
    audioBitrate: number;
    width: number;
    height: number;
    container: "mp4" | "webm";
  }[]
  videoDetails: {
    title: string;
    description: string;
    video_url: string;
    thumbnails: {
      url: string;
      height: number;
      width: number;
    }[]
  }
}

function uniq(a: string[]) {
  var seen = {};
  return a.filter(function (item) {
    // @ts-ignore
    return seen.hasOwnProperty(item) ? false : (seen[item] = true);
  });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function App() {
  const searchInputRef = createRef<HTMLInputElement>();
  const backdropRef = createRef<HTMLDivElement>();
  const searchButton = createRef<HTMLButtonElement>();
  const [messageTitle, setMessageTitle] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [messageQueue, setMessageQueue] = useState<IMessage[]>([]);
  const formatsRef = createRef<HTMLDivElement>();
  const messageBoxRef = createRef<HTMLDivElement>();
  const searchDivRef = createRef<HTMLDivElement>();
  const loadingDivRef = createRef<HTMLDivElement>();
  const infoDivRef = createRef<HTMLDivElement>();
  const downloadButtonRef = createRef<HTMLDivElement>();
  const audioDropdownRef = createRef<HTMLSelectElement>();
  const videoQualityDropdownRef = createRef<HTMLSelectElement>();
  const [currentInfo, setCurrentInfo] = useState<IVIdeoInfo>();
  const [formatSelected, setFormatedSelected] = useState<string>("mp3");

  const ShowMessage = (title: string, message: string) => {
    setMessageTitle(title);
    setMessageContent(message);
  }

  const queueMessage = (title: string, message: string) => {
    let backdrop = backdropRef.current;

    if (backdrop?.style == null) return;

    setMessageQueue(old => [...old, { title, message }]);

    if (backdrop.style.display == "none" || backdrop.style.display == "") {
      backdrop.style.display = "flex";
      ShowMessage(title, message);
    }
  }

  const closeMessage = async () => {
    let backdrop = backdropRef.current;

    if (backdrop?.style == null) return;

    if (messageQueue.length <= 1) backdrop.style.display = "none";
    else ShowMessage(messageQueue[0].title, messageQueue[0].message);
    setMessageQueue(old => old.splice(0, 1));
  }

  // const getFormat = () => {
  //   let formatsDiv = formatsRef.current;

  //   if (formatsDiv?.children == null) return;

  //   let formatInputs = formatsDiv.getElementsByClassName("formatInput");

  //   for (let i = 0; i < formatInputs.length; i++) {
  //     // @ts-ignore
  //     if (formatInputs.item(i).checked) {
  //       // @ts-ignore
  //       return { format: formatInputs.item(i)?.id, type: formatInputs.item(i).value };
  //     }
  //   }

  //   return { type: "none" };
  // }

  const search = async () => {
    let sinput = searchInputRef.current;
    let sbutton = searchButton.current;
    let searchDiv = searchDivRef.current;
    let loadingDiv = loadingDivRef.current;
    let infoDiv = infoDivRef.current;

    if (sinput?.value == null) return;
    if (sbutton?.disabled == null) return;
    if (sinput.value == "") return;
    if (searchDiv?.style == null) return;
    if (loadingDiv?.style == null) return;
    if (infoDiv?.style == null) return;

    sbutton.disabled = true;
    searchDiv.style.display = "none";
    loadingDiv.style.display = "flex";

    let data = await fetch(`/api/videoInfo?url=${sinput.value}`);

    switch (data.status) {
      case 422:
        queueMessage('Invalid format, please enter a youtube video link', '');
        loadingDiv.style.display = "none";
        searchDiv.style.display = "flex";
        sbutton.disabled = false;
        break;
      case 404:
        queueMessage('Video not found', '');
        loadingDiv.style.display = "none";
        searchDiv.style.display = "flex";
        sbutton.disabled = false;
        break;
      case 500:
        queueMessage('Code: 500', 'Internal server error');
        loadingDiv.style.display = "none";
        searchDiv.style.display = "flex";
        sbutton.disabled = false;
        break;
      case 200:
        setCurrentInfo(await data.json());
        loadingDiv.style.display = "none";
        infoDiv.style.display = "flex";
        break;
    }
  }

  const download = async () => {
    let dbutton = searchButton.current;
    let backdrop = backdropRef.current;
    let msgBox = messageBoxRef.current;
    let videoDropdown = videoQualityDropdownRef.current;

    if (dbutton?.disabled == null) return;
    if (backdrop?.style == null) return;
    if (msgBox?.style == null) return;
    msgBox.style.display = "none";
    backdrop.style.display = "flex";
    dbutton.disabled = true;

    if (["mp4", "flv", "avi", "webm"].includes(formatSelected) && videoDropdown?.value != null) {
      const newwindow = window.open(`/api/downloadVideo?url=${currentInfo?.videoDetails.video_url}&format=${formatSelected}&quality=${videoDropdown.value}`);

      if (newwindow == null) return;
      newwindow.onbeforeunload = () => {
        if (backdrop?.style != null) backdrop.style.display = "none";
        if (dbutton?.disabled != null) dbutton.disabled = false;
      }
    } else {
      let newwindow = window.open(`/api/downloadAudio?url=${currentInfo?.videoDetails.video_url}&format=${formatSelected}`);

      if (newwindow == undefined) return;
      newwindow.onbeforeunload = () => {
        if (backdrop?.style != null) backdrop.style.display = "none";
        if (dbutton?.disabled != null) dbutton.disabled = false;
      }
    }
  }

  const setFormat = (e: React.MouseEvent<HTMLInputElement, MouseEvent>) => {
    // @ts-ignore
    setFormatedSelected(e.target.value);
  }

  return (
    <div className="App">
      <div ref={searchDivRef} className="contentDiv">
        <h1>Enter a youtube link to download!</h1>
        <input type="text" ref={searchInputRef} />
        <button ref={searchButton} onClick={() => search()}>Search</button>
      </div>
      <div ref={loadingDivRef} className="contentDiv showNoneFirst">
        <Spinner color="white" className="spinner" name="line-scale-pulse-out-rapid" fadeIn="none" />
      </div>
      <div ref={infoDivRef} className="contentDiv showNoneFirst videoInfoDiv">
        <a href={currentInfo?.videoDetails.video_url} target="_blank" >
          <div className="videoInfo">
            <img src={currentInfo?.videoDetails.thumbnails[0].url} alt="" />
            <p>{currentInfo?.videoDetails.title}</p>
          </div>
        </a>
        <div ref={formatsRef} className="formats">
          <input onClick={setFormat} type="radio" name="format" value="mp4" id="mp4" className="formatInput" />
          <label htmlFor="mp4">mp4</label>
          <input onClick={setFormat} type="radio" name="format" value="avi" id="avi" className="formatInput" />
          <label htmlFor="avi">avi</label>
          <input onClick={setFormat} type="radio" name="format" value="flv" id="flv" className="formatInput" />
          <label htmlFor="flv">flv</label>
          <input onClick={setFormat} type="radio" name="format" value="webm" id="webm" className="formatInput" />
          <label htmlFor="webm">webm</label>
          <input onClick={setFormat} type="radio" name="format" value="3gp" id="3gp" className="formatInput" />
          <label htmlFor="3gp">3gp</label>
          <input onClick={setFormat} type="radio" defaultChecked name="format" value="mp3" id="mp3" className="formatInput" />
          <label htmlFor="mp3">mp3</label>
          <input onClick={setFormat} type="radio" name="format" value="ogg" id="ogg" className="formatInput" />
          <label htmlFor="ogg">ogg</label>
          <input onClick={setFormat} type="radio" name="format" value="wav" id="wav" className="formatInput" />
          <label htmlFor="wav">wav</label>
        </div>
        {["mp4", "flv", "webm", "avi", '3gp'].includes(formatSelected) ? <select name="quality" id="quality" ref={videoQualityDropdownRef}>
          {currentInfo?.formats.filter(x => x.container === "mp4").map(x => x.qualityLabel).filter(x => x != undefined && x != "").map((x, i) => (
            <option key={i} value={x}>{x}</option>
          ))}
        </select> : ''}
        <button onClick={() => download()}>Download</button>
      </div>
      {/* <div className="downloadInfo">
        <input type="text" />
        <select name="quality" id="quality">
          <option value="144p">144p</option>
          <option value="144p 15fps">144p 15fps</option>
          <option value="360p">360p</option>
          <option value="480p">480p</option>
          <option value="720p">720p</option>
          <option value="720p60">720p60</option>
          <option value="1080p">1080p</option>
          <option value="1080p60">1080p60</option>
        </select>
        <select name="format" id="format">
          <option value="flv">flv</option>
          <option value="3gp">3gp</option>
          <option value="mp4">mp4</option>
          <option value="webm">webm</option>
          <option value="ts">ts</option>
        </select>
      </div> */}
      <div ref={backdropRef} className="backdrop">
        <div ref={messageBoxRef} className="message">
          <h1>{messageTitle}</h1>
          <h3>{messageContent}</h3>
          <button onClick={() => closeMessage()}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default App;

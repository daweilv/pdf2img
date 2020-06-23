import React, {useRef, useState,} from 'react';
import './App.scss';
import JSZip from 'jszip';
import {saveAs} from 'file-saver';

const INITIAL_TIPS = '点击选择文件上传 或 拖动图片到此';
const HELP_TIPS = '松开鼠标以上传图片'
let pdfDoc,file_name;
const zip = new JSZip();

function App() {

    const [tips, setTips] = useState(INITIAL_TIPS);
    const [desiredWidth, setDesiredWidth] = useState(1920);
    const [desiredWidthOption, setDesiredWidthOption] = useState(1);
    const [fileType, setFileType] = useState('jpeg');
    const [quality, setQuality] = useState('0.82');

    const [downloadBtnStatus, setDownloadBtnStatus] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedCount, setProcessedCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const inputEl = useRef(null);
    const uploadWrapperEl = useRef(null);

    function handleDragEnter() {
        setTips(HELP_TIPS)
    }

    function handleDragLeave(e) {
        if (e.target !== uploadWrapperEl.current && !uploadWrapperEl.current.contains(e.target)) {
            setTips(INITIAL_TIPS)
        }
    }

    async function handleUpload(e) {
        e.preventDefault();
        setTips(INITIAL_TIPS);
        setIsProcessing(true);
        const fs = e.dataTransfer ? e.dataTransfer.files : e.target.files;
        file_name = fs[0].name.split('.')[0];
        const type = fs[0].type;
        console.log(type)
        if (type !== 'application/pdf') return;
        const pdfjsLib = await import('pdfjs-dist/build/pdf');
        pdfjsLib.GlobalWorkerOptions.workerSrc = await import('pdfjs-dist/build/pdf.worker.entry');

        let reader = new FileReader();
        reader.onloadend = function () {
            pdfjsLib.getDocument({data: this.result}).promise.then(function (pdfDoc_) {
                pdfDoc = pdfDoc_;
                setTotalCount(pdfDoc.numPages)
                renderPages();
            });
        }
        reader.readAsArrayBuffer(fs[0]);

    }

    async function renderPages() {
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            await renderPage(pageNum, zip)
            setProcessedCount(pageNum);
        }
        setDownloadBtnStatus(false)
    }

    async function renderPage(pageNum, zip) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')
        const page = await pdfDoc.getPage(pageNum)

        const viewport = page.getViewport({scale: 1,});
        const scale = desiredWidth / viewport.width;
        canvas.width = desiredWidth;
        canvas.height = viewport.height * scale;

        const scaledViewport = page.getViewport({scale: scale,});
        const renderContext = {
            canvasContext: ctx,
            viewport: scaledViewport
        };
        const renderTask = page.render(renderContext);
        await renderTask.promise;
        const imgData = canvas.toDataURL(`image/${fileType}`, fileType === 'jpeg' ? quality : null);
        zip.file(pageNum + `.${fileType === 'jpeg' ? 'jpg' : 'png'}`, imgData.substring(`data:image/${fileType};base64,`.length), {base64: true});
    }

    function downloadImgs() {
        zip.generateAsync({type: "blob"})
            .then(function (content) {
                saveAs(content, `${file_name}.zip`);
            });
    }

    return (
        <div className="container">
            <h2>在线 pdf 转换图片</h2>
            <div className="config">
                <div className="form-group row">
                    <label htmlFor="" className="col-sm-2">上传文件</label>

                    <div className="col-sm-10">
                        {!isProcessing ?
                            <div className="upload-wrapper"
                                 ref={uploadWrapperEl}
                                 onDragEnter={handleDragEnter}
                                 onDragLeave={handleDragLeave}
                                 onDragOver={(e) => {
                                     e.preventDefault()
                                 }}
                                 onDrop={handleUpload}
                                 onClick={() => {
                                     inputEl.current.click()
                                 }}
                            >
                                <input ref={inputEl} className="uploader" type="file" name="upload" id="upload"
                                       onChange={handleUpload} accept="application/pdf"/>
                                <img src={require('./assets/upload.svg')} alt="选择文件"/>
                                <div className="upload-tips">{tips}</div>
                            </div>
                            :
                            <div className="upload-wrapper">
                                <div className="progress ">
                                    <div className="progress-bar progress-bar-striped progress-bar-animated"
                                         role="progressbar"
                                         style={{width: `${processedCount / totalCount * 100}%`}}>{processedCount}/{totalCount}</div>
                                </div>
                            </div>

                        }
                    </div>

                </div>

                <div className="form-group row">
                    <legend className="col-form-label col-sm-2 pt-0">类型</legend>
                    <div className="col-sm-10">
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" name="fileType" id="fileType1"
                                   value="option1" checked={fileType === 'jpeg'} onChange={() => {
                                setFileType('jpeg')
                            }}/>
                            <label className="form-check-label" htmlFor="fileType1">
                                jpeg
                            </label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" name="fileType" id="fileType2"
                                   value="option2" checked={fileType === 'png'} onChange={() => {
                                setFileType('png')
                            }}/>
                            <label className="form-check-label" htmlFor="fileType2">
                                png
                            </label>
                        </div>
                    </div>
                </div>

                {fileType === 'jpeg' &&
                (<div className="form-group row">
                    <label className="col-sm-2" htmlFor="">压缩比<br/>(默认0.82)</label>
                    <div className="col-sm-10">
                        <input type="text" className="form-control" value={quality} onChange={(e) => {
                            setQuality(e.target.value)
                        }}/>
                    </div>
                </div>)
                }

                <div className="form-group row">
                    <legend className="col-form-label col-sm-2 pt-0">宽度<br/>(高度等比缩放)</legend>
                    <div className="col-sm-10">
                        <div className="form-check">
                            <input className="form-check-input" type="radio" name="size" id="size1"
                                   value="option1" checked={desiredWidthOption === 1} onChange={() => {
                                setDesiredWidthOption(1)
                                setDesiredWidth(1920)
                            }}/>
                            <label className="form-check-label" htmlFor="size1">
                                1920
                            </label>
                        </div>
                        <div className="form-check">
                            <input className="form-check-input" type="radio" name="size" id="size2"
                                   value="option2" checked={desiredWidthOption === 2} onChange={() => {
                                setDesiredWidthOption(2)
                                setDesiredWidth(1280)
                            }}/>
                            <label className="form-check-label" htmlFor="size2">
                                1280
                            </label>
                        </div>
                        <div className="form-check">
                            <input className="form-check-input" type="radio" name="size" id="size3"
                                   value="option3" checked={desiredWidthOption === 3} onChange={() => {
                                setDesiredWidthOption(3)
                            }}/>
                            <input type="text" disabled={desiredWidthOption !== 3} placeholder="自定义"
                                   className="form-control form-control-sm"
                                   onChange={(e) => {
                                       setDesiredWidth(e.target.value)
                                   }}/>
                        </div>

                    </div>
                </div>
                <div className="form-group row">
                    <div className="col-sm-10 offset-sm-2">
                        <button className="btn btn-primary btn-lg btn-block" onClick={downloadImgs}
                                disabled={downloadBtnStatus}>点击下载
                        </button>
                    </div>
                </div>


            </div>
            <div className="process-progress">

            </div>
        </div>
    );
}

export default App;

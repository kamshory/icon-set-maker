/**
 * Original icon dimension
 */
let iconDimensions = {width:640, height:640};

let iconSetInfo = [
    {fileName:'android-chrome-512x512.png', type:'image/png', width:512, height:512},
    {fileName:'android-chrome-192x192.png', type:'image/png', width:192, height:192},
    {fileName:'apple-touch-icon.png', type:'image/png', width:180, height:180},
    {fileName:'favicon-32x32.png', type:'image/png', width:32, height:32},
    {fileName:'favicon-16x16.png', type:'image/png', width:16, height:16},
    {fileName:'favicon.ico', type:'image/x-ico', width:32, height:32}
];

/**
 * Create new icon
 */
let clickNewIcon = function(){
    $.confirm("<strong>Do you want to clear the drawing?</strong>\nThis will also erase your undo history", function(ok) {
        if(!ok) 
        {
            return;
        }
        let width = iconDimensions.width;
        let height = iconDimensions.height;
        svgCanvas.clear();
        svgCanvas.setResolution(width, height);
        $("#canvas_width").val(width);
        $("#canvas_height").val(height);
    });
};

let IconSet = {
    pendingProcess:0,
    finishedProcess:0,
    data: []
};

/**
 * Export current icon
 */
let clickExportIcon = function(){ 
    let data = svgCanvas.svgCanvasToString()+'';
    let width = iconDimensions.width;
    let height = iconDimensions.height;
    IconSet.data.push({
        fileName:'safari-pinned-tab.svg',
        width:width,
        height:height,
        content:data
    }
    );
    for(let i in iconSetInfo)
    {
        exportRaster(data, width, height, iconSetInfo[i].fileName, iconSetInfo[i].type, iconSetInfo[i].width, iconSetInfo[i].height);
    }
    exportAndDownload('icons.zip');
};

/**
 * Export image and download it
 * @param {string} fileName ZIP file name
 * @returns {void}
 */
let exportAndDownload = function(fileName)
{
    if(IconSet.pendingProcess > IconSet.finishedProcess)
    {
        setTimeout(function(){
            exportAndDownload();
        });
        return;
    }
    const zip = new JSZip();
    for(let i in IconSet.data)
    {
        zip.file(IconSet.data[i].fileName, IconSet.data[i].content);
    }

    zip.generateAsync({ type: 'blob' }).then(function (content) {
        saveAs(content, fileName);
    });
}

/**
 * Export image as raster
 * @param {string} data XML data containing image
 * @param {number} originalWidth Original image width
 * @param {number} originalHeight Original image height
 * @param {string} fileName File name
 * @param {string} type Image type
 * @param {number} width Target image width
 * @param {number} height Target image width
 * @returns {void}
 */
let exportRaster = function(data, originalWidth, originalHeight, fileName, type, width, height)
{
    IconSet.pendingProcess++;
    let DOMURL = window.URL || window.webkitURL || window;			
    let img = new Image();
    let svg = new Blob([data], {type: 'image/svg+xml'});
    let url = DOMURL.createObjectURL(svg);				
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');				
    img.onload = function() {
        canvas.setAttribute('width', width);
        canvas.setAttribute('height', height);
        ctx.drawImage(img, 0, 0, originalWidth, originalHeight, 0, 0, width, height);
        DOMURL.revokeObjectURL(url);
        canvas.toBlob(function(blobPng) {
            if(type == 'image/x-ico')
            {
                let images = [];
                let reader = new FileReader();
                reader.readAsArrayBuffer(blobPng);
                reader.onloadend = (event) => {
                    images[0] = new Uint8Array(reader.result);
                    let icoData = pngToIco(images); 
                    let blobIco = new Blob([new Uint8Array(icoData)], {type: type});
                    IconSet.data.push({
                        fileName:fileName,
                        width:width,
                        height:height,
                        content:blobIco
                    });                              
                    IconSet.finishedProcess++;
                }
            }
            else if(type == 'image/png')
            {
                canvas.toBlob(function(blobPng) {
                    IconSet.data.push({
                        fileName:fileName,
                        width:width,
                        height:height,
                        content:blobPng
                    });            
                    IconSet.finishedProcess++;
                });
            }         
        });   
    }				
    img.src = url;
}

/**
 * 
 * @param {Array} images Uint8Array of PNG image data
 * @returns {Array} Uint8Array of ICO image data
 */
let pngToIco = function(images)
{
    let icoHead = [ //.ico header
        0, 0, // Reserved. Must always be 0 (2 bytes)
        1, 0, // Specifies image type: 1 for icon (.ICO) image, 2 for cursor (.CUR) image. Other values are invalid. (2 bytes)
        images.length & 255, (images.length >> 8) & 255 // Specifies number of images in the file. (2 bytes)
    ];

    let icoBody = [];
    let pngBody = [];

    for(let i = 0, num, pngHead, pngData, offset = 0; i < images.length; i++)
    {
        pngData = Array.from( images[i] );
        pngHead = [ //image directory (16 bytes)
            0,    // Width 0-255, should be 0 if 256 pixels (1 byte)
            0,    // Height 0-255, should be 0 if 256 pixels (1 byte)
            0,    // Color count, should be 0 if more than 256 colors (1 byte)
            0,    // Reserved, should be 0 (1 byte)
            1, 0, // Color planes when in .ICO format, should be 0 or 1, or the X hotspot when in .CUR format (2 bytes)
            32, 0 // Bits per pixel when in .ICO format, or the Y hotspot when in .CUR format (2 bytes)
        ];
        num = pngData.length;
        for (let i = 0; i < 4; i++)
        {
            pngHead[pngHead.length] = ( num >> ( 8 * i )) & 255; // Size of the bitmap data in bytes (4 bytes)
        }
        num = icoHead.length + (( pngHead.length + 4 ) * images.length ) + offset;
        for (let i = 0; i < 4; i++)
        {
            pngHead[pngHead.length] = ( num >> ( 8 * i )) & 255; // Offset in the file (4 bytes)
        }
        offset += pngData.length;
        icoBody = icoBody.concat(pngHead); // combine image directory
        pngBody = pngBody.concat(pngData); // combine actual image data
    }
    return icoHead.concat(icoBody, pngBody);
}

$(document).ready(function(e){
    $(document).on('click', '#new_icon', function(e2){
        clickNewIcon();
    });
    $(document).on('click', '#export_icon', function(e2){
        clickExportIcon();
    });
});
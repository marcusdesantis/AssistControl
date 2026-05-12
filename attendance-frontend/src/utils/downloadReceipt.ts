import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { isNative } from '@/utils/platform'

export async function downloadReceiptAsPdf(htmlContent: string, invoiceId: string): Promise<void> {
  const fileName = `comprobante-${invoiceId}.pdf`

  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;'
  container.innerHTML = htmlContent
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false })
    const imgData = canvas.toDataURL('image/jpeg', 0.92)

    const margin  = 12                                        // mm por todos los lados
    const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW   = pdf.internal.pageSize.getWidth()          // 210 mm
    const pageH   = pdf.internal.pageSize.getHeight()         // 297 mm
    const imgW    = pageW  - margin * 2                       // 186 mm
    const imgH    = (canvas.height * imgW) / canvas.width     // altura proporcional
    const usableH = pageH - margin * 2                        // 273 mm por página

    if (imgH <= usableH) {
      pdf.addImage(imgData, 'JPEG', margin, margin, imgW, imgH)
    } else {
      // Contenido multi-página: recorta por franjas
      const ratio      = canvas.width / imgW                  // px por mm
      const sliceH_px  = Math.floor(usableH * ratio)          // px de cada franja
      let   offsetY    = 0
      while (offsetY < canvas.height) {
        const sliceCanvas  = document.createElement('canvas')
        sliceCanvas.width  = canvas.width
        sliceCanvas.height = Math.min(sliceH_px, canvas.height - offsetY)
        const ctx = sliceCanvas.getContext('2d')!
        ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height)
        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92)
        const sliceImgH = sliceCanvas.height / ratio
        if (offsetY > 0) pdf.addPage()
        pdf.addImage(sliceData, 'JPEG', margin, margin, imgW, sliceImgH)
        offsetY += sliceH_px
      }
    }

    if (isNative) {
      const b64 = pdf.output('datauristring').split(',')[1]
      await Filesystem.writeFile({ path: fileName, data: b64, directory: Directory.Cache, recursive: true })
      const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache })
      try {
        await Share.share({ title: fileName, url: uri, dialogTitle: 'Guardar o compartir' })
      } catch (e) {
        const msg = String(e).toLowerCase()
        if (!msg.includes('cancel') && !msg.includes('abort') && !msg.includes('dismiss')) throw e
      }
    } else {
      pdf.save(fileName)
    }
  } finally {
    document.body.removeChild(container)
  }
}

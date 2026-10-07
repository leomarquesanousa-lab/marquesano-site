import {PortalError} from './auth.mjs';
import {validatePhoto} from './repository.mjs';

// Remove EXIF/GPS, XMP and text comments before persisting public photos.
// No third-party image service receives uploaded files.
export function sanitizePhoto(input) {
 const {mime}=validatePhoto(input);
 let output;
 try {
  if(mime==='image/jpeg') {
   const parts=[input.subarray(0,2)];let offset=2;
   while(offset<input.length){
    if(input[offset]!==0xff)throw Error('Invalid JPEG marker');
    const marker=input[offset+1];
    if(marker===0xda){parts.push(input.subarray(offset));offset=input.length;break;}
    if(marker===0xd9){parts.push(input.subarray(offset,offset+2));offset+=2;break;}
    if(marker===0xff){offset++;continue;}
    if(offset+4>input.length)throw Error('Truncated JPEG');
    const length=input.readUInt16BE(offset+2);
    if(length<2||offset+2+length>input.length)throw Error('Invalid JPEG segment');
    if(![0xe1,0xed,0xfe].includes(marker))parts.push(input.subarray(offset,offset+2+length));
    offset+=2+length;
   }
   output=Buffer.concat(parts);
  } else if(mime==='image/png') {
   const parts=[input.subarray(0,8)];let offset=8,ended=false;
   while(offset+12<=input.length){
    const length=input.readUInt32BE(offset);if(offset+12+length>input.length)throw Error('Truncated PNG');
    const type=input.toString('ascii',offset+4,offset+8);
    if(!['eXIf','tEXt','iTXt','zTXt'].includes(type))parts.push(input.subarray(offset,offset+12+length));
    offset+=12+length;if(type==='IEND'){ended=true;break;}
   }
   if(!ended)throw Error('Missing PNG end');output=Buffer.concat(parts);
  } else {
   const parts=[];let offset=12;
   while(offset+8<=input.length){
    const length=input.readUInt32LE(offset+4);const end=offset+8+length+(length%2);
    if(end>input.length)throw Error('Truncated WebP');
    const type=input.toString('ascii',offset,offset+4);
    if(!['EXIF','XMP '].includes(type)){
     const chunk=Buffer.from(input.subarray(offset,end));
     if(type==='VP8X'&&length>=10)chunk[8]&=~0x0c;
     parts.push(chunk);
    }
    offset=end;
   }
   if(!parts.length)throw Error('Empty WebP');
   const header=Buffer.from(input.subarray(0,12));header.writeUInt32LE(4+parts.reduce((n,p)=>n+p.length,0),4);output=Buffer.concat([header,...parts]);
  }
 }catch{throw new PortalError('Esta foto está corrompida ou incompleta. Escolha outra imagem.');}
 return {mime,buffer:output};
}

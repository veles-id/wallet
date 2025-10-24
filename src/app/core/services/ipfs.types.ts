export interface IPFSUploadResult {
  cid: string;
  size: number;
  name: string;
}

export interface IPFSRetrieveResult {
  data: string;
  contentType: string;
}

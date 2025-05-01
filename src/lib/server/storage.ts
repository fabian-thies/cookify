import * as fs from "node:fs";
import {UPLOAD_DIR} from "./config";
import path from "node:path";
import {randomUUID} from "node:crypto";

async function ensureUploadDIr() {
    await fs.promises.mkdir(UPLOAD_DIR, {recursive: true});
}

export async function saveFile(file: File): Promise<string> {
    await ensureUploadDIr();

    const ext = path.extname(file.name)
    const fileName = `${randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.promises.writeFile(filePath, buffer);

    return fileName;
}

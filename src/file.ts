import { deflate, inflate } from 'pako';
import { FileSource, LocalFileSource } from './SceneProvider';
import { openFileLocal, saveFileLocal } from './file/localFile';
import { upgradeScene } from './file/upgrade';
import { Scene } from './scene';

export async function saveFile(scene: Readonly<Scene>, source: FileSource): Promise<void> {
    switch (source.type) {
        case 'local':
            await saveFileLocal(scene, source.name);
    }
}

export async function openFile(source: FileSource): Promise<Scene> {
    const scene = await openFileUnvalidated(source);
    return upgradeScene(scene);
}

async function openFileUnvalidated(source: LocalFileSource) {
    switch (source.type) {
        case 'local':
            return await openFileLocal(source.name);
    }
}

export function sceneToText(scene: Readonly<Scene>): string {
    const binaryData = deflate(JSON.stringify(scene));
    return btoa(String.fromCharCode(...binaryData));
}

export function textToScene(data: string): Scene {
    const binaryData = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const scene = JSON.parse(String.fromCharCode(...inflate(binaryData)));

    validateScene(scene);
    return scene;
}

export function sceneToJson(scene: Readonly<Scene>): string {
    return JSON.stringify(scene, undefined, 2);
}

export function jsonToScene(json: string): Scene {
    const scene = JSON.parse(json);
    validateScene(scene);

    return upgradeScene(scene);
}

function validateScene(obj: unknown): asserts obj is Scene {
    if (typeof obj !== 'object') {
        throw new Error('Expected an object');
    }

    // TODO: try to check that this is valid data
}

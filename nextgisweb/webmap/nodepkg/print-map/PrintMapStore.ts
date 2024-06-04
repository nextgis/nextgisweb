import { makeAutoObservable } from "mobx";

export interface RndCoords {
    x: number;
    y: number;
    width: number | string;
    height: number | string;
}

class PrintMapStore {
    legend: RndCoords = {
        x: 5,
        y: 55,
        width: 300,
        height: 200,
    };

    title: RndCoords = {
        x: 5,
        y: 5,
        width: "50%",
        height: 42,
    };

    constructor() {
        makeAutoObservable(this);
    }
}

export const printMapStore = new PrintMapStore();

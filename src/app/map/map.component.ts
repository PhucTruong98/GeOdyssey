import { Component, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import countryData from '../../assets/data/countries.json';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { PlatformService } from '../core/services/platform.service';
import { HttpClient } from '@angular/common/http';
import gsap from 'gsap';
import * as C from '../shared/constants';
import { CountryMapComponent } from './country-map/country-map.component';
import Panzoom, { PanzoomObject } from '@panzoom/panzoom';
import * as d3 from "d3";



interface Region {
  code: string;
  name: string;
  population: number;
  imageUrl: string;
  description: string;
}

interface Country {
  code: string;
  name: string;
}
@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  standalone: false
})
export class MapComponent implements AfterViewInit {

  @ViewChild('worldLayer', { static: true }) worldLayer!: ElementRef<HTMLObjectElement>;
  @ViewChild('countryLayer', { static: true }) countryLayer!: ElementRef<HTMLObjectElement>;
  @ViewChild(CountryMapComponent, { static: false })
  private countryCmp!: CountryMapComponent;


  @ViewChild('mapWrapper', { static: false }) mapWrapperRef!: ElementRef;


  private zoom?: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private svgSel?: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private gSel?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private observer?: MutationObserver;


  curHeight = 0;
  curWidth = 0;

  svgEl!: SVGSVGElement;

  worldSvg = "";
  countrySvg = "";

  svgContent: string = "";
  private cachedSvg: string | null = null;

  countryMap: Record<string, string> = {};
  currentCountryCode: string = "";
  regions: Region[] = [];
  selectedRegion: Region | null = null;

  selectedCountryCode: string | null = null;
  private panZoomInstance: any;
  private panZoomInstanceCountry: any;

  private panZoomObj?: PanzoomObject;

  // private zoomOutHandler: (() => void) | null = null;

  initialZoomLevel: any;
  isLoadingMap = false;
  hasInitializedSvg: any;
  isZoomed = false;
  isScreenWide = false;


  worldMapLineBorderThickness = 0.5;
  quantileArr: number[] = [];
  areas: number[] = [];



  constructor(
    private platform: PlatformService,
    private http: HttpClient,
    private cd: ChangeDetectorRef,

  ) { }

  ngAfterViewInit(): void {
    if (!this.platform.isBrowser) return;

    // // 🔥 Register zoom handler here:
    // this.zoomOutHandler = () => {
    //   const currentZoom = this.panZoomInstanceCountry!.getZoom();
    //   if (currentZoom < this.initialZoomLevel * 0.6) {
    //     this.backToWorld();
    //   }
    // };
    const wrapperEl = this.mapWrapperRef.nativeElement as HTMLElement;
    this.curHeight = wrapperEl.offsetHeight;
    this.curWidth = wrapperEl.offsetWidth;



    //build lookup map for countries
    (countryData as Country[]).forEach(c => {
      this.countryMap[c.code.toUpperCase()] = c.name;
    });

    this.loadWorldMap();


  }





  loadWorldMap() {

    if (this.isLoadingMap) return;
    this.isLoadingMap = true;

    const runInit = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.initializeSVG();
          this.isLoadingMap = false;
        });
      });
    };



    if (this.cachedSvg) {
      this.svgContent = this.cachedSvg;
      this.worldSvg = this.cachedSvg;

      runInit();
    } else {
      this.http.get('assets/maps/world-map-final5.svg', { responseType: 'text' }).subscribe(svg => {
        this.cachedSvg = svg;
        this.svgContent = svg;
        this.worldSvg = svg;
        runInit();
      });
    }


    this.isLoadingMap = false

  }

  initializeSVG() {

    const svgEl = this.worldLayer.nativeElement.querySelector('svg') as SVGSVGElement;
    // const svgEl = this.worldLayer.nativeElement as SVGSVGElement;


    if (!svgEl) return;

    this.svgEl = svgEl;

    svgEl.style.backgroundColor = '#ADD8E6';



    // 1) Create a group for each size class
    const sizeClasses = ['vlarge', 'large', 'medium', 'small', 'vsmall'] as const;
    const groups: Record<string, SVGGElement> = {};
    sizeClasses.forEach(cls => {
      const g = document.createElementNS(C.SVG_NS, 'g');
      g.setAttribute('id', `labels-${cls}`);
      // default to no pointer-events; we'll enable on zoom
      // g.setAttribute('pointer-events', 'none');
      svgEl.appendChild(g);
      groups[cls] = g;
    });





    //add names
    const paths = Array.from(svgEl.querySelectorAll<SVGPathElement>('path[id]'));
    // 1. Compute raw areas
    this.areas = paths.map(p => {
      const b = p.getBBox();
      return b.width * b.height;
    });
    const sorted = [...this.areas].sort((a, b) => a - b);
    // 2. Determine the five quantile boundaries
    const q = (f: number) => sorted[Math.floor(sorted.length * f)];
    this.quantileArr = [0.2, 0.4, 0.6, 0.9].map(q);



    this.setupZoom(svgEl);
    this.injectHoverStyles(svgEl);

    const countries = svgEl.querySelectorAll<SVGPathElement>('path[id]');
    countries.forEach((path, i) => this.setupCountry(path as SVGPathElement, svgEl, i, groups));


  }


  setupZoom(svgEl: SVGSVGElement) {



    if (!this.platform.isBrowser) return;


    const originalWidth = svgEl.getAttribute('width');
    const originalHeight = svgEl.getAttribute('height');

    // const sizes = this.panZoomInstance.getSizes();
    let ogRatio = 1000 / 482;
    let zoomFactor = 1;
    let targetHeight = this.curHeight;
    let targetWidth = this.curHeight * ogRatio;
    this.initialZoomLevel = this.curHeight / 482;




    if (this.curWidth / this.curHeight > ogRatio) {

      this.isScreenWide = true;
      targetWidth = this.curWidth;
      targetHeight = targetWidth / ogRatio;
      this.initialZoomLevel = this.curWidth / 1000;

    }


    let viewport = this.svgEl.querySelector('#world-map') as SVGGElement;

    this.svgSel = d3.select(this.svgEl);
    this.gSel = d3.select(viewport);

    //set up country text
    const labelsG = d3.select(viewport)
      .append('g')
      .attr('id', 'labels')
      .attr('pointer-events', 'none'); // labels shouldn’t steal taps

    // Add a label at each country’s bbox center
d3.select(viewport)
  .selectAll<SVGPathElement, unknown>('path[id]')
  .each((_d, i, nodes) => {
    const p = nodes[i] as SVGPathElement;  // element here
    const code = (p.id || '').toUpperCase();
    const name = this.countryMap[code] ?? code;

    const b = p.getBBox();
    labelsG.append('text')
      .attr('x', b.x + b.width / 2)
      .attr('y', b.y + b.height / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('class', 'country-label')
      .text(name);
  });


    const vb = this.svgEl.viewBox.baseVal;
    const contentExtent: [[number, number], [number, number]] =
      [[vb.x, vb.y], [vb.x + vb.width, vb.y + vb.height]];

    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 20])
      .translateExtent(contentExtent)
      .on('zoom', (event) => {
        this.gSel!.attr('transform', event.transform.toString());
        //     const { x, y, k } = event.transform;
        // console.log('panX:', x, 'panY:', y, 'zoom scale:', k);

      });

    this.svgSel.call(this.zoom as any);

    // Optional: fit content nicely on load
    // this.fitToContent(this.svgEl, viewport);

    // Keep your country taps working; ignore clicks that followed a drag
    d3.select(this.worldLayer.nativeElement)
      .selectAll<SVGPathElement, unknown>('path[id]')
      .on('click', (event) => {
        if ((event as any).defaultPrevented) return; // was a drag
        const p = event.currentTarget as SVGPathElement;
        const box = p.getBBox();
        this.zoomToBBox(p);          // zoom to the clicked country

        // If UI doesn't update, later wrap this call in NgZone.run(...)
        // this.onCountryClicked(p, box.height);
      });

    // If you prefer pointerup (since it worked for you), use this instead:
    // d3.select(this.worldLayer.nativeElement)
    //   .selectAll<SVGPathElement, unknown>('.country')
    //   .on('pointerup', (event) => {
    //     const p = event.currentTarget as SVGPathElement;
    //     const box = p.getBBox();
    //     this.onCountryClicked(p, box.height);
    //   });










    svgEl.setAttribute('width', targetWidth.toString());
    svgEl.setAttribute('height', targetHeight.toString());
    svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');



    // svgEl.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    // dynamic import inside browser guard






    // const svgPanZoom = mod.default;
    // this.panZoomInstance = svgPanZoom(svgEl, {
    //   zoomEnabled: true,
    //   controlIconsEnabled: true,
    //   fit: true,
    //   center: true,
    //   minZoom: 0.5,
    //   maxZoom: 1000,
    //   onPan: (newPan: { x: number; y: number }) => {
    //     // console.log(`Pan changed → x: ${newPan.x}, y: ${newPan.y}`);
    //     // e.g. update a component property
    //     // this.currentPan = newPan;
    //   }
    // });





    // const sizes = this.panZoomInstance.getSizes();
    // let ogRatio = sizes.viewBox.width / sizes.viewBox.height;
    // let targetWidth = sizes.height * ogRatio;
    // let zoomFactor = 1;

    // const sizes = this.panZoomObj.getSizes();
    // let ogRatio = 1000 / 482;
    // let targetWidth = sizes.height * ogRatio;
    // let zoomFactor = 1;




    // if (sizes.width <= targetWidth) {
    //   zoomFactor = targetWidth / sizes.width;
    // }

    // else if (sizes.width > targetWidth) {
    //   zoomFactor *= sizes.width / targetWidth;
    // }




    // this.panZoomInstance.zoom(zoomFactor);
    // this.panZoomInstance.center();
    // this.panZoomInstance.resize();
    // this.panZoomInstance.setMinZoom(zoomFactor);
    // // this.initialZoomLevel = zoomFactor;
    // this.onZoomHandler(zoomFactor);


    //set scrolling boundary
    // this.panZoomInstance.setBeforePan((oldPan: any, newPan: { x: number; y: number; }) => {
    //   const sizes = this.panZoomInstance.getSizes();
    //   // real content size (in px) after current zoom
    //   const realW = sizes.viewBox.width * sizes.realZoom;
    //   const realH = sizes.viewBox.height * sizes.realZoom;

    //   // container size in px
    //   const contW = this.curWidth;
    //   const contH = this.curHeight;

    //   // compute the min/max pan.x so the content always overlaps the container
    //   const minX = Math.min(0, contW - realW);
    //   const maxX = 0;
    //   // likewise for pan.y
    //   const minY = Math.min(0, contH - realH);
    //   const maxY = 0;

    //   // clamp
    //   return {
    //     x: Math.max(minX, Math.min(newPan.x, maxX)),
    //     y: Math.max(minY, Math.min(newPan.y, maxY))
    //   };
    // });

    // //set onZoom listener
    // this.panZoomInstance.setOnZoom((newZoom: number) => {

    //   this.onZoomHandler(newZoom);
    // });









  }

  injectHoverStyles(svgEl: SVGSVGElement) {


    // 🔥 Inject hover style into <style> tag
    //note, we have to add styling here instead of html because SVG object are loaded as a separate doc, isolated from angular
    const style = document.createElementNS(C.SVG_NS, 'style');

    svgEl.style.setProperty('--hover-stroke', '1px');
    style.textContent = `
        :root {
      --label-font:        12px;
    }

        path {
          transition: fill 0.3s ease, stroke 0.3s ease;
        }
        path:hover {
          fill:rgb(246, 137, 137);
          stroke: #fff;
          stroke-width: var(--hover-stroke) !important;;
          filter: drop-shadow(0 0 2px rgba(30, 246, 178, 0.3));
        }

        /* define your vars at the SVG root */


    svg {
      --label-font: 6px;     /* initial font size */
      --label-opacity: 0;      /* hidden by default */
    }

    /* hover, land, etc… your existing path rules… */

    /* now label rules reference those vars */
    text.country-label {
      font-family: sans-serif;
      font-size: var(--label-font);
      fill: #000;
      text-anchor: middle;
      dominant-baseline: middle;

      /* */
      stroke: #fff;
      stroke-width: var(--label-font-cover);
      paint-order: stroke fill;
      stroke-linejoin: round;
    filter: drop-shadow(0 0 var(--label-font-cover) rgba(0,0,0,0.5));

    }

  text.country-label:hover {
    /* change fill if you want… */
    fill: #e63946;
    /* add a white border */
    stroke: #fff;
    stroke-width: var(--label-font-cover);
    paint-order: stroke fill;
    /* optional drop-shadow for extra pop */
    filter: drop-shadow(0 0 var(--label-font-cover) rgba(0,0,0,0.5));
  }

      `;
    svgEl.appendChild(style!);
  }

  setupCountry(p: SVGPathElement, svgEl: SVGSVGElement, i: number, groups: Record<string, SVGGElement>) {

    p.setAttribute('fill', '#FFD8A9');
    p.setAttribute('stroke', '#ccc');
    // p.setAttribute('stroke-width', '0.5');

    p.setAttribute('stroke', '#000');
    // p.setAttribute('stroke-width', '0.1');
    p.setAttribute('stroke-linejoin', 'round');
    p.setAttribute('stroke-linecap', 'round');

    const area = this.areas[i];
    let cls = 'vsmall';
    if (area >= this.quantileArr[3]) cls = 'vlarge';
    else if (area >= this.quantileArr[2]) cls = 'large';
    else if (area >= this.quantileArr[1]) cls = 'medium';
    else if (area >= this.quantileArr[0]) cls = 'small';



    const code = p.id?.toUpperCase();
    const name = this.countryMap[code];

    const box = p.getBBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;








    if (name) {
      const title = document.createElementNS(C.SVG_NS, 'title');
      title.textContent = name + " width " + box.width + " height " + box.height + " X " + box.x + " y " + box.y;
      p.appendChild(title);


      const text = document.createElementNS(C.SVG_NS, 'text');
      text.setAttribute('class', `country-label ${cls}`);
      text.setAttribute('x', cx.toString());
      text.setAttribute('y', cy.toString());

      text.setAttribute('role', 'button');           // ARIA
      text.setAttribute('tabindex', '0');            // keyboard focus
      text.style.cursor = 'pointer';                 // show hand cursor
      text.style.pointerEvents = 'all';              // ensure it receives clicks


      text.textContent = name;

      text.addEventListener('pointerup', () => this.onCountryClicked(p, box.height));
      // groups[cls].appendChild(text);
    }

    p.style.cursor = 'pointer';



    // p.addEventListener('pointerup', () => this.onCountryClicked(p, box.height));
  }


  onCountryClicked(p: SVGPathElement, height: number) {


    // if (!this.panZoomInstance) return;
    // const { x: currentX, y: currentY } = this.panZoomInstance.getPan();

    // console.log("curX", currentX, "curY", currentY)
    // Optional: load country data after zoom
    setTimeout(() => {
      const code = p.id.toUpperCase();
      // this.loadCountryMap(code);
      // this.selectedCountryCode = code;
      this.currentCountryCode = code;


      const pathEl = this.svgEl.getElementById(code) as SVGPathElement;
      if (!pathEl) return console.warn(`No path for ${code}`);

      // 2) get its bounding box in viewBox coords
      const box = pathEl.getBBox();

      // 3) ask svg-pan-zoom for the container & viewBox sizes

      // const sizes = this.panZoomInstance.getSizes();
      // const contW = sizes.width;
      // const contH = sizes.height;
      // let curCountScreenHeight = contH * (box.height / 482);

      // let zoom = contH / curCountScreenHeight;


      // zoom = 482 / box.height;

      //container H / onSCreen height = box.height

      // zoom = this.curHeight / (box.height * this.initialZoomLevel)


      // if (box.width / box.height > this.curWidth / this.curHeight) {
      //   zoom = (this.curWidth * 1000 / box.width) / (this.curHeight * 1000 / 482);
      // }

      // 4) compute a zoom that fits the country’s height into the container
      // zoom = 2;
      // this.panZoomInstance.zoom(zoom);

      // 5) compute the pan needed to center that box
      //    map box center → container center
      const boxCx = box.x + box.width;
      const boxCy = box.y + box.height;
      let offsetX = 0; let offsetY = 0;

      // if (box.width / box.height <= this.curWidth / this.curHeight) {
      //   offsetX = this.curWidth / 2 - box.width * this.initialZoomLevel * zoom / 2;

      // }

      // else {
      //   offsetY = this.curHeight / 2 - box.height * this.initialZoomLevel * zoom / 2;

      // }


      // offsetX = 0;
      // offsetY = 0;


      // const panX = - (box.x) * zoom * this.initialZoomLevel + offsetX;
      // const panY = - (box.y) * zoom * this.initialZoomLevel + offsetY;


      // const panX = - (box.x - offsetX) * zoom * this.initialZoomLevel;
      // const panY = - (box.y - offSetY) * zoom * this.initialZoomLevel;


      // this.panZoomInstance.pan({ x: panX, y: panY });

      // console.log("current x pan after clicked", this.panZoomInstance.getPan().x)
      // 6) now flip into “country” mode
      this.isZoomed = true;

      //add this line because there is issue with isZoomed boolean updated in child component, do detectChange to let parent know about the change in isZoomed
      this.cd.detectChanges();

      this.countryCmp.loadCountryMap(code, height);


    }, 400); // allow zoom animation before changing

  }


  onZoomHandler(newZoom: number) {
    const BASE_FONT = 10;       // px at zoom = 1
    const THRESHOLDS = {
      vlarge: 0.5,
      large: 3.0,
      medium: 6.0,
      small: 9.0,
      vsmall: 12.0
    };        // const sw = baseStroke / newZoom;
    // svgEl.querySelectorAll('path').forEach(p => p.setAttribute('stroke-width', `${sw}`));
    const landGroup = this.svgEl.querySelector('#world-map')!;
    let zoomRatio = this.initialZoomLevel / newZoom;
    let newThick = this.worldMapLineBorderThickness * zoomRatio;
    landGroup.setAttribute('stroke-width', `${newThick}px`);

    // console.log("Cur ZOom Value: ",this.panZoomInstance.getZoom());

    this.svgEl.style.setProperty('--hover-stroke', `${newThick}px`);

    //set country label size
    const fontSize = (BASE_FONT * zoomRatio).toFixed(1) + 'px';
    const borderFontSize = (BASE_FONT * zoomRatio / 4).toFixed(1) + 'px';
    // // 3) Apply all six vars in one go
    const s = this.svgEl.style;
    // new country labels text opacity code
    Object.entries(THRESHOLDS).forEach(([cls, minZoom]) => {
      const grp = this.svgEl.querySelector<SVGGElement>(`#labels-${cls}`);
      if (!grp) return;
      const visible = 1 / zoomRatio >= minZoom;

      // grp.style.pointerEvents = visible ? 'all' : 'none';
      if (visible) {
        grp.removeAttribute('display');     // back to default (visible)
      } else {
        grp.setAttribute('display', 'none'); // hide + block events
      }

      grp.style.opacity = visible ? '1' : '0';

    });

    // 3) Apply both in one go
    s.setProperty('--label-font', fontSize);
    s.setProperty('--label-font-cover', borderFontSize);

    // svgEl.style.setProperty('--label-opacity', "1");}

  }



  private fitToContent(svg: SVGSVGElement, viewport: SVGGElement) {
    const vb = svg.viewBox.baseVal;
    const w = vb.width || svg.clientWidth;
    const h = vb.height || svg.clientHeight;

    const b = viewport.getBBox();
    const scale = Math.min(w / b.width, h / b.height);
    // const tx = w / 2 - scale * (b.x + b.width / 2);
    // const ty = h / 2 - scale * (b.y + b.height / 2);
    const tx = - scale * (b.x);
    const ty = - scale * (b.y);


    this.svgSel!.call(
      (this.zoom!.transform as any),
      d3.zoomIdentity.translate(tx, ty).scale(scale)
    );
  }


  // helpers you can keep in your component
  private zoomToBBox(p: SVGPathElement) {
    let svg = p.ownerSVGElement!;
    const vb = svg.viewBox.baseVal;
    const W = vb.width || svg.clientWidth;
    const H = vb.height || svg.clientHeight;

    let box = p.getBBox();

    let padding = 0;
    // add padding around the country
    const bw = box.width + padding * 2;
    const bh = box.height + padding * 2;

    let hFit = false;
    // choose a scale that fits the bbox into the viewport
    if (this.curWidth / bw >= this.curHeight / bh) {
      hFit = true;
    }
    let scale = Math.min(this.curWidth / bw, this.curHeight / bh) / this.initialZoomLevel;
    // const scale = Math.min(20, 0.95 * Math.min(W / bw, H / bh)); // clamp to your max
    // const tx = W / 2 - scale * (box.x + box.width  / 2);
    // const ty = H / 2 - scale * (box.y + box.height / 2);

    let offsetX = 0;
    let offsetY = 0;
    if (hFit) {
      offsetX = ((this.curWidth / this.curHeight) - (bw / bh)) / 2 * bh * scale
    }
    else {
      offsetY = ((this.curHeight / this.curWidth) - (bh / bw)) / 2 * bw * scale

    }
    // let offsetX = hFit? (this.curWidth - bw * scale * this.initialZoomLevel ) / 2 : 0;
    // let offsetY = hFit? 0 : (this.curHeight - bh * scale * this.initialZoomLevel) / 2 ;

    // offsetX = 0;
    // offsetY = 0;

    const tx = - scale * (box.x) + offsetX;
    const ty = - scale * (box.y) + offsetY;

    // smooth zoom
    this.svgSel!
      .transition()
      .duration(750)
      .call(
        this.zoom!.transform as any,
        d3.zoomIdentity.translate(tx, ty).scale(scale)
      ).on('end', () => {
        // This runs only after animation completes
        this.onCountryClicked(p, box.height);
      });;
  }

  private zoomToElement(p: SVGPathElement) {
    // const svg = p.ownerSVGElement!;
    this.zoomToBBox(p);
  }

  // optional: zoom back out to the whole world
  private zoomToWorld() {
    const svg = this.svgSel!.node()!;
    const g = this.gSel!.node()!;
    const b = g.getBBox();
    const vb = svg.viewBox.baseVal;
    const W = vb.width || svg.clientWidth;
    const H = vb.height || svg.clientHeight;
    const scale = 0.95 * Math.min(W / b.width, H / b.height);
    const tx = W / 2 - scale * (b.x + b.width / 2);
    const ty = H / 2 - scale * (b.y + b.height / 2);

    this.svgSel!
      .transition()
      .duration(750)
      .call(
        this.zoom!.transform as any,
        d3.zoomIdentity.translate(tx, ty).scale(scale)
      );
  }




  ngOnDestroy() {
    this.observer?.disconnect();
    if (this.svgSel) this.svgSel.on('.zoom', null); // unbind d3-zoom
    d3.select(this.worldLayer.nativeElement).selectAll('.path[id]').on('click', null);
  }



}

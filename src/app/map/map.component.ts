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



type LabelNode = {
  id: string; name: string; x: number; y: number; w: number; h: number; area: number;
  minK: number; el: HTMLDivElement;
};

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

    @ViewChild('labelOverlay', { static: true }) labelOverlay!: ElementRef<HTMLDivElement>;


  private zoom?: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private svgSel?: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private gSel?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private observer?: MutationObserver;

private labelNodes: LabelNode[] = [];
private lastT = d3.zoomIdentity;
private rafPending = false;


  currentK = 1;

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



    this.setupZoom(svgEl);
    this.injectHoverStyles(svgEl);

    const countries = svgEl.querySelectorAll<SVGPathElement>('path[id]');
    countries.forEach((path, i) => this.setupCountry(path as SVGPathElement, svgEl, i));


  }


  setupZoom(svgEl: SVGSVGElement) {



    if (!this.platform.isBrowser) return;




    const originalWidth = svgEl.getAttribute('width');
    const originalHeight = svgEl.getAttribute('height');

    // const sizes = this.panZoomInstance.getSizes();
    let ogRatio = 1000 / 482;
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

    this.buildOverlayLabels(this.svgEl, viewport)




  //set up zoom
    const vb = this.svgEl.viewBox.baseVal;
    let offX = vb.width * Math.max(1 - ((this.curWidth / this.curHeight) / (1000 / 482)), 0);
    let offY = vb.height * Math.max(1 - ((this.curHeight / this.curWidth) / (482 / 1000)), 0);


    const contentExtent: [[number, number], [number, number]] =
      [[0, 0], [vb.width + offX, vb.height + offY]];



    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 20])
      .translateExtent(contentExtent)
      .on('zoom', (event) => {
        this.gSel!.attr('transform', event.transform.toString());
        //     const { x, y, k } = event.transform;
        // console.log('panX:', x, 'panY:', y, 'zoom scale:', k);
            // labels.attr('display', (d: any) => (event.transform.k >= d.minK ? null : 'none'));

            // schedule one overlay update per frame
  this.lastT = event.transform;
  if (!this.rafPending) {
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      this.updateOverlay(this.lastT);
    });
  }


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



    svgEl.setAttribute('width', targetWidth.toString());
    svgEl.setAttribute('height', targetHeight.toString());
    svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');


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

  setupCountry(p: SVGPathElement, svgEl: SVGSVGElement, i: number) {

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



private buildOverlayLabels(svg: SVGSVGElement, viewport: SVGGElement) {
  const overlay = this.labelOverlay.nativeElement;

  const paths = d3.select(viewport).selectAll<SVGPathElement, unknown>('path[id]').nodes();
  const tmp: Omit<LabelNode, 'minK'|'el'>[] = paths.map(p => {
    const code = (p.id || '').toUpperCase();
    const b = (p as SVGPathElement).getBBox();
    return {
      id: code,
      name: this.countryMap[code] ?? code,
      x: b.x + b.width/2,
      y: b.y + b.height/2,
      w: b.width,
      h: b.height,
      area: b.width * b.height,
    };
  });
// LOD via quantiles → min zoom k
  const areas = tmp.map(d => d.area);
  const minKScale = d3.scaleQuantile<number>()
    .domain(areas)
    .range([18, 15 ,12,9,7, 5, 3, 1]); // tune

  // Create DOM nodes once
  this.labelNodes = tmp.map(d => {
    const el = document.createElement('div');
    el.className = 'country-label';
    el.textContent = d.name;
    el.style.position = 'absolute';
    el.style.transform = 'translate(-9999px,-9999px)'; // offscreen initially
    el.style.pointerEvents = 'none';
    overlay.appendChild(el);
    return { ...d, minK: minKScale(d.area), el };
  });
  }

  //   private fitWorld(svg: SVGSVGElement) {
  //   const g = this.gSel!.node()!;
  //   const b = g.getBBox();
  //   const W = svg.viewBox.baseVal.width  || svg.clientWidth;
  //   const H = svg.viewBox.baseVal.height || svg.clientHeight;
  //   const scale = 0.95 * Math.min(W / b.width, H / b.height);
  //   const tx = W / 2 - scale * (b.x + b.width / 2);
  //   const ty = H / 2 - scale * (b.y + b.height / 2);

  //   this.svgSel!
  //     .transition().duration(0)
  //     .call(this.zoom!.transform as any, d3.zoomIdentity.translate(tx, ty).scale(scale));
  // }

private updateOverlay(t: d3.ZoomTransform) {
  const svg = this.svgSel!.node()!;
  const W = this.curWidth, H = this.curHeight;

  // Compute the visible bounds in SVG coordinates (for culling)
  // const x0 = t.invertX(0),   y0 = t.invertY(0);
  // const x1 = t.invertX(W),   y1 = t.invertY(H);
  const x0 = 0,   y0 = 0;
  const x1 = this.curWidth / this.initialZoomLevel,   y1 = this.curHeight / this.initialZoomLevel;
  for (const d of this.labelNodes) {
    // LOD: only show when zoomed in enough
    if (t.k < d.minK) { d.el.style.display = 'none'; continue; }

    // Frustum culling: skip labels offscreen (in SVG coords)
    if (d.x < x0 || d.x > x1 || d.y < y0 || d.y > y1) {
      d.el.style.display = 'none'; continue;
    }

    // Project to screen pixels and show
    const sx = t.applyX(d.x) * this.initialZoomLevel;
    const sy = t.applyY(d.y) * this.initialZoomLevel;
    d.el.style.display = 'block';
    // constant-size labels (no counter-scale needed for HTML overlay)
    d.el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%,-50%)`;
  }
}

  ngOnDestroy() {
    this.observer?.disconnect();
    if (this.svgSel) this.svgSel.on('.zoom', null); // unbind d3-zoom
    d3.select(this.worldLayer.nativeElement).selectAll('.path[id]').on('click', null);
  }



}

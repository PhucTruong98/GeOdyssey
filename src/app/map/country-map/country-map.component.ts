import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { PlatformService } from '../../core/services/platform.service';
import { HttpClient } from '@angular/common/http';

import * as C from '../../shared/constants';
import * as d3 from "d3";

type StatesLabelNode = {
  id: string; name: string; x: number; y: number; w: number; h: number; area: number;
  minK: number; el: HTMLDivElement;
};


interface Region {
  code: string;
  name: string;
  population: number;
  imageUrl: string;
  description: string;
}
@Component({
  selector: 'app-country-map',
  standalone: false,
  templateUrl: './country-map.component.html',
  styleUrl: './country-map.component.scss'
})
export class CountryMapComponent implements AfterViewInit {

  @Output() isZoomed = new EventEmitter<boolean>();


  @ViewChild('countryMapWrapper', { static: false }) mapWrapperRef!: ElementRef;


  countryCode: string = "";
  countryLayer!: ElementRef<HTMLElement>;

  areas: number[] = [];
  quantileArr: number[] = [];
  svgEl!: SVGSVGElement;

  //d3 related stuff
  private zoom?: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private svgSel?: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private gSel?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private observer?: MutationObserver;

  private labelNodes: StatesLabelNode[] = [];
  private lastT = d3.zoomIdentity;
  private rafPending = false;

  //for scale calculation
  private intialScale = 1;
  curHeight = 0;
  curWidth = 0;
  hFit = false;
  xOffset = 0;
  yOffset = 0;





  //have to add this code to avoid issue with coutnryLayer = undefine when first load this component, this ensure this.countryLayer is referenced after the map is loaded (when ngIf is done)
  @ViewChild('countryLayer', { static: false, read: ElementRef })
  set countryLayerRef(el: ElementRef<HTMLElement>) {
    if (!el) return;
    this.countryLayer = el;
  }


  @ViewChild('labelOverlay', { static: true }) labelOverlay!: ElementRef<HTMLDivElement>;


  countrySvg = "";
  regions: Region[] = [];
  selectedRegion: Region | null = null;
  private panZoomInstanceCountry: any;
  private zoomOutHandler: (() => void) | null = null;

  initialZoomLevel: any = 1;

  isLoadingMap = false;

  curMapH: number = 0;
  curMapW: number = 0;



  constructor(
    private platform: PlatformService,
    private http: HttpClient

  ) { }


  // ngOnChanges(changes: SimpleChanges) {
  //   if (changes['countryCode'] && this.countryCode != "") {
  //     // this.isZoomed.emit(true);
  //     this.loadCountryMap(this.countryCode);
  //   }
  // }


  ngAfterViewInit(): void {
    if (!this.platform.isBrowser) return;



    // // 🔥 Register zoom handler here:
    // this.zoomOutHandler = () => {
    //   const currentZoom = this.panZoomInstanceCountry!.getZoom();
    //   if (currentZoom < this.initialZoomLevel * 0.6) {
    //     this.backToWorld();
    //   }
    // };
  }

  zoomHandler(newZoom: number) {
    const currentZoom = this.panZoomInstanceCountry!.getZoom();
    if (currentZoom < this.initialZoomLevel * 0.6) {
      this.backToWorld();
    }
  }



  loadCountryMap(code: string) {

    if (this.isLoadingMap) return;
    this.isLoadingMap = true;

    this.isZoomed.emit(true);
    //reset minmax




    // this.currentCountryCode = code;
    this.selectedRegion = null;

    const url = `assets/maps/countries/${code}/${code}.svg`;

    // this.svgMap.nativeElement.data = `assets/maps/countries/${code}/regions.svg`;

    this.http.get(url, { responseType: 'text' }).subscribe(async svg => {
      // this.svgContent = svg;
      // this.currentCountryCode = code;
      this.countrySvg = svg;

      if (this.panZoomInstanceCountry) {
        this.panZoomInstanceCountry.destroy();
      }

      requestAnimationFrame(() => {
        setTimeout(async () => {
          this.svgEl = this.countryLayer.nativeElement.querySelector('svg') as SVGSVGElement;
          if (!this.svgEl) return;




          this.scaleCheck();



          // // 1) Create a group for each size class
          // const sizeClasses = ['large', 'medium', 'small'] as const;
          // const groups: Record<string, SVGGElement> = {};
          // sizeClasses.forEach(cls => {
          //   const g = document.createElementNS(C.SVG_NS, 'g');
          //   g.setAttribute('id', `labels-${cls}`);
          //   // default to no pointer-events; we'll enable on zoom
          //   // g.setAttribute('pointer-events', 'none');
          //   this.svgEl.appendChild(g);
          //   groups[cls] = g;
          // });





          // //add names
          // const paths = Array.from(this.svgEl.querySelectorAll<SVGPathElement>('path[id]'));
          // // 1. Compute raw areas
          // this.areas = paths.map(p => {
          //   const b = p.getBBox();
          //   return b.width * b.height;
          // });
          // const sorted = [...this.areas].sort((a, b) => a - b);
          // // 2. Determine the five quantile boundaries
          // const q = (f: number) => sorted[Math.floor(sorted.length * f)];
          // this.quantileArr = [0.3, 0.6].map(q);

          //------------------

          this.setupStyles();
          const regions = this.svgEl.querySelectorAll('path[id]') as NodeListOf<SVGPathElement>;
          regions.forEach((path, i) => this.setupRegions(path, i));

          this.setupZoom();
          this.isLoadingMap = false;
        }, 0);

      });
    });



  }
  scaleCheck() {

    const wrapperEl = this.mapWrapperRef.nativeElement as HTMLElement;
    this.curHeight = wrapperEl.offsetHeight;
    this.curWidth = wrapperEl.offsetWidth;
    this.curMapH = this.svgEl.viewBox.baseVal.height;
    this.curMapW = this.svgEl.viewBox.baseVal.width;
    if (this.curMapW / this.curMapH < this.curWidth / this.curHeight) {
      this.hFit = true;
      this.intialScale = this.curHeight / this.curMapH;
      this.xOffset = ((this.curWidth / this.curHeight) - (this.curMapW / this.curMapH)) / 2 * this.curMapH * this.intialScale;
      this.yOffset = 0;
    }
    else {
      this.hFit = false;
      this.intialScale = this.curWidth / this.curMapW;
      this.yOffset = ((this.curHeight / this.curWidth) - (this.curMapH / this.curMapW)) / 2 * this.curMapW * this.intialScale;
      this.xOffset = 0;
    }




  }




  private buildOverlayLabels(viewport: SVGGElement) {
    const overlay = this.labelOverlay.nativeElement;

    const paths = d3.select(viewport).selectAll<SVGPathElement, unknown>('path[id]').nodes();
    const tmp: Omit<StatesLabelNode, 'minK' | 'el'>[] = paths.map(p => {
      const code = (p.id || '').toUpperCase();
      const b = (p as SVGPathElement).getBBox();
      return {
        id: code,
        name: p.dataset['name'] ? p.dataset['name'] : "",
        x: b.x + b.width / 2,
        y: b.y + b.height / 2,
        w: b.width,
        h: b.height,
        area: b.width * b.height,
      };
    });
    // LOD via quantiles → min zoom k
    const areas = tmp.map(d => d.area);
    const minKScale = d3.scaleQuantile<number>()
      .domain(areas)
      .range([10, 7, 4, 2, 1]); // tune




    // Create DOM nodes once
    this.labelNodes = tmp.map(d => {
      const el = document.createElement('div');
      el.className = 'country-label';
      el.textContent = d.name;
      el.style.position = 'absolute';
      // el.style.transform = 'translate(-9999px,-9999px)'; // offscreen initially


      el.style.pointerEvents = 'none';
      overlay.appendChild(el);
      return { ...d, minK: minKScale(d.area), el };
    });
  }


  backToWorld() {
    this.isZoomed.emit(false);

    // this.currentCountryCode = null;
    this.countrySvg = '';
    // this.countryCode = '';

    if (this.panZoomInstanceCountry) {

      // Remove zoom listener
      if (this.zoomOutHandler) {
        this.panZoomInstanceCountry?.setOnZoom(() => { });
        // this.zoomOutHandler = null;
      }


    } else {
      // this.currentCountryCode = null;
    }

  }


  async setupZoom() {

    if (!this.platform.isBrowser) return;

    // const { default: svgPanZoom } = await import('svg-pan-zoom');
    // this.panZoomInstanceCountry = svgPanZoom(svgEl, {
    //   zoomEnabled: true,
    //   controlIconsEnabled: true,
    //   minZoom: 0.5,
    //   maxZoom: 20
    // });



    // this.initialZoomLevel = this.panZoomInstanceCountry.getZoom();
    // this.panZoomInstanceCountry.zoom(this.initialZoomLevel * 1.0001);

    // //add listtener for zooming out event
    // this.panZoomInstanceCountry.setOnZoom((newZoom: number) => this.onZoom(svgEl, newZoom));

    // this.onZoom(svgEl, this.initialZoomLevel)

    let viewport = (this.svgEl.querySelector(':scope > g') as SVGGElement) || this.svgEl; // fallback to svg

    this.svgSel = d3.select(this.svgEl);
    this.gSel = d3.select(viewport);

    this.buildOverlayLabels(viewport)


    //set up zoom
    const vb = this.svgEl.viewBox.baseVal;
    // let offX = vb.width * Math.max(1 - ((this.curWidth / this.curHeight) / (1000 / 482)), 0);
    // let offY = vb.height * Math.max(1 - ((this.curHeight / this.curWidth) / (482 / 1000)), 0);

    let offX = 0;
    let offY = 0;

    const contentExtent: [[number, number], [number, number]] =
      [[0, 0], [vb.width + offX, vb.height + offY]];



    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 20])
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
            this.onZoom(event.transform);
            this.updateOverlay(this.lastT);
          });
        }


      });

    this.svgSel.call(this.zoom as any);

    // Optional: fit content nicely on load
    // this.fitToContent(this.svgEl, viewport);

    // Keep your country taps working; ignore clicks that followed a drag
    d3.select(this.countryLayer.nativeElement)
      .selectAll<SVGPathElement, unknown>('path[id]')
      .on('click', (event) => {
        if ((event as any).defaultPrevented) return; // was a drag
        const p = event.currentTarget as SVGPathElement;
        const box = p.getBBox();
        // this.zoomToBBox(p);          // zoom to the clicked country

        // If UI doesn't update, later wrap this call in NgZone.run(...)
        // this.onCountryClicked(p, box.height);
      });

  }

  setupRegions(region: SVGPathElement, i: number) {
    region.setAttribute('fill', '#FFD8A9');
    region.setAttribute('stroke', '#ccc');
    // p.setAttribute('stroke-width', '0.5');

    region.setAttribute('stroke', '#000');
    // p.setAttribute('stroke-width', '0.1');
    region.setAttribute('stroke-linejoin', 'round');
    region.setAttribute('stroke-linecap', 'round');


    const area = this.areas[i];
    let cls = 'small';
    if (area >= this.quantileArr[1]) cls = 'large';
    else if (area >= this.quantileArr[0]) cls = 'medium';



    const code = region.id?.toUpperCase();

    const box = region.getBBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;



    const regionName = region.dataset['name'];
    if (regionName) {
      const title = document.createElementNS(C.SVG_NS, 'title');
      title.textContent = regionName;
      region.appendChild(title);

      const text = document.createElementNS(C.SVG_NS, 'text');
      text.setAttribute('class', `country-label ${cls}`);
      text.setAttribute('x', cx.toString());
      text.setAttribute('y', cy.toString());

      text.setAttribute('role', 'button');           // ARIA
      text.setAttribute('tabindex', '0');            // keyboard focus
      text.style.cursor = 'pointer';                 // show hand cursor
      text.style.pointerEvents = 'all';              // ensure it receives clicks


      text.textContent = regionName;

      text.addEventListener('click', () => this.onRegionClicked(region));
      // groups[cls].appendChild(text);

    }

    region.style.cursor = 'pointer';
    region.addEventListener('click', () => this.onRegionClicked(region));
  }

  onRegionClicked(region: SVGPathElement) {
    const regionCode = region.id.toUpperCase();
    this.selectedRegion = this.regions.find(r => r.code === regionCode) || null;

  }

  setupStyles() {
    this.svgEl.setAttribute('viewBox', `0 0 ${this.svgEl.getAttribute('width')} ${this.svgEl.getAttribute('height')}`);
    // // now make it fluid
    this.svgEl.setAttribute('width', '100%');
    this.svgEl.setAttribute('height', '100%');
    // this.svgEl.setAttribute('preserveAspectRatio', 'xMidYMid slice');


    const style = document.createElementNS(C.SVG_NS, 'style');
    style.textContent = `
          path {
            transition: fill 0.3s ease, stroke 0.3s ease;
          }
          path:hover {
            fill: #388e3c;
            stroke: #fff;
          stroke-width: var(--hover-stroke) !important;;
            filter: drop-shadow(0 0 2px rgba(0,0,0,0.3));
          }

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
    this.svgEl.appendChild(style);
  }



  private updateOverlay(t: d3.ZoomTransform) {
    const svg = this.svgSel!.node()!;
    for (const d of this.labelNodes) {
      // LOD: only show when zoomed in enough
      if (t.k < d.minK) { d.el.style.display = 'none'; continue; }


      // this.xOffset = 0;
      // this.yOffset = 0;


      // Project to screen pixels and show
      // const sx = t.applyX(d.x * this.intialScale + this.xOffset);
      // const sy = t.applyY(d.y * this.intialScale + this.yOffset);
      const sx = t.applyX(d.x ) * this.intialScale + this.xOffset;
      const sy = t.applyY(d.y ) * this.intialScale + this.yOffset;
      d.el.style.display = 'block';
      // constant-size labels (no counter-scale needed for HTML overlay)
      d.el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%,-50%)`;
    }
  }



  onZoom(newZoom: any) {
    {
      if (newZoom.k < this.initialZoomLevel * 0.6) {
        this.backToWorld();
      }


      // const BASE_FONT = 14 * (this.curMapHeight / 600);       // px at zoom = 1
      // const BASE_BORDER_THICKNESS = 0.5;
      // const THRESHOLDS = {
      //   large: 0.5,
      //   medium: 1.8,
      //   small: 3.0,
      // };        // const sw = baseStroke / newZoom;
      // // svgEl.querySelectorAll('path').forEach(p => p.setAttribute('stroke-width', `${sw}`));
      // // const landGroup = svgEl.querySelector('#country-map')!;
      // let zoomRatio = newZoom;
      // let newThick = BASE_BORDER_THICKNESS * zoomRatio;
      // // landGroup.setAttribute('stroke-width', `${newThick}px`);

      // svgEl.style.setProperty('--hover-stroke', `${newThick}px`);


      // //set country label size
      // const fontSize = (BASE_FONT * (1 / zoomRatio)).toFixed(1) + 'px';
      // const borderFontSize = (BASE_FONT * (0.2 / zoomRatio)).toFixed(1) + 'px';
      // // // 3) Apply all six vars in one go
      // const s = svgEl.style;
      // // new country labels text opacity code
      // Object.entries(THRESHOLDS).forEach(([cls, minZoom]) => {
      //   const grp = svgEl.querySelector<SVGGElement>(`#labels-${cls}`);
      //   if (!grp) return;
      //   const visible = zoomRatio >= minZoom;

      //   // grp.style.pointerEvents = visible ? 'all' : 'none';
      //   if (visible) {
      //     grp.removeAttribute('display');     // back to default (visible)
      //   } else {
      //     grp.setAttribute('display', 'none'); // hide + block events
      //   }

      //   grp.style.opacity = visible ? '1' : '0';

      // });

      // // 3) Apply both in one go
      // s.setProperty('--label-font', fontSize);
      // s.setProperty('--label-font-cover', borderFontSize);



    }
  }
}

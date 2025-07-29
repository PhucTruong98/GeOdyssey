import { Component, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import countryData from '../../assets/data/countries.json';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { PlatformService } from '../core/services/platform.service';
import { HttpClient } from '@angular/common/http';
import gsap from 'gsap';
import * as C from '../shared/constants';
import { CountryMapComponent } from './country-map/country-map.component';


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

  // private zoomOutHandler: (() => void) | null = null;

  initialZoomLevel: any;
  isLoadingMap = false;
  hasInitializedSvg: any; 
  isZoomed = false;


  worldMapLineBorderThickness = 0.5;
  quantileArr: number[] = [];
  areas: number[] = [];



  constructor(
    private platform: PlatformService,
    private http: HttpClient,
    private cd: ChangeDetectorRef

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


    //build lookup map for countries
    (countryData as Country[]).forEach(c => {
      this.countryMap[c.code.toUpperCase()] = c.name;
    });

    this.loadWorldMap();

  }



  // loadCountryMap(code: string) {
  //   if (this.isLoadingMap) return;
  //   this.isLoadingMap = true;

  //   // this.initialZoomLevel = this.panZoomInstanceCountry.getZoom();
  //   this.currentCountryCode = code;
  //   this.selectedRegion = null;

  //   const url = `assets/maps/countries/${code}/${code}.svg`;

  //   // this.svgMap.nativeElement.data = `assets/maps/countries/${code}/regions.svg`;

  //   this.http.get(url, { responseType: 'text' }).subscribe(async svg => {
  //     this.countrySvg = svg;
  //     // this.svgContent = svg;
  //     this.currentCountryCode = code;

  //     if (this.panZoomInstanceCountry) {
  //       this.panZoomInstanceCountry.destroy();
  //     }

  //     requestAnimationFrame(() => {
  //       setTimeout(async () => {

  //         // this.isZoomed = true;

  //         const svgEl = this.countryLayer.nativeElement.querySelector('svg') as SVGSVGElement;
  //         if (!svgEl) return;
  //         svgEl.setAttribute('viewBox', `0 0 ${svgEl.getAttribute('width')} ${svgEl.getAttribute('height')}`);
  //         // now make it fluid
  //         svgEl.setAttribute('width', '100%');
  //         svgEl.setAttribute('height', '100%');
  //         svgEl.setAttribute('preserveAspectRatio', 'xMidYMid slice');

  //         const style = document.createElementNS(C.SVG_NS, 'style');
  //         style.textContent = `
  //       path {
  //         transition: fill 0.3s ease, stroke 0.3s ease;
  //       }
  //       path:hover {
  //         fill: #388e3c;
  //         stroke: #fff;
  //         stroke-width: 1.5;
  //         filter: drop-shadow(0 0 2px rgba(0,0,0,0.3));
  //       }
  //     `;
  //         svgEl.appendChild(style);

  //         const regions = svgEl.querySelectorAll('path[id]') as NodeListOf<SVGPathElement>;
  //         regions.forEach(region => {
  //           const regionName = region.dataset['name'];
  //           if (regionName) {
  //             const title = document.createElementNS(C.SVG_NS, 'title');
  //             title.textContent = regionName;
  //             region.appendChild(title);
  //           }

  //           region.style.cursor = 'pointer';


  //           region.addEventListener('click', () => {
  //             const regionCode = region.id.toUpperCase();
  //             this.selectedRegion = this.regions.find(r => r.code === regionCode) || null;
  //           });
  //         });

  //         const { default: svgPanZoom } = await import('svg-pan-zoom');
  //         this.panZoomInstanceCountry = svgPanZoom(svgEl, {
  //           zoomEnabled: true,
  //           controlIconsEnabled: true,
  //           minZoom: 0.5,
  //           maxZoom: 20
  //         });


  //         this.initialZoomLevel = this.panZoomInstanceCountry.getZoom();
  //         // this.panZoomInstanceCountry.zoom(1.3);

  //         //add listtener for zooming out event
  //         this.panZoomInstanceCountry.setOnZoom(this.zoomOutHandler);

  //         this.isLoadingMap = false;
  //       }, 0);

  //     });
  //   });

  // }


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


    svgEl.style.backgroundColor = '#ADD8E6';
    // Create a group to hold all labels
    const labelsGroup = document.createElementNS(C.SVG_NS, 'g');
    labelsGroup.setAttribute('id', 'country-labels');
    svgEl.appendChild(labelsGroup);

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
    countries.forEach((path, i) => this.setupCountry(path as SVGPathElement, svgEl, labelsGroup, i));


  }


  setupZoom(svgEl: SVGSVGElement) {

    if (!this.platform.isBrowser) return;

    svgEl.setAttribute('viewBox', `0 0 ${svgEl.getAttribute('width')} ${svgEl.getAttribute('height')}`);
    svgEl.setAttribute('width', '100%');
    svgEl.setAttribute('height', '100%');
    svgEl.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    // dynamic import inside browser guard
    import('svg-pan-zoom').then(mod => {
      const svgPanZoom = mod.default;
      this.panZoomInstance = svgPanZoom(svgEl, {
        zoomEnabled: true,
        controlIconsEnabled: true,
        fit: true,
        center: true,
        minZoom: 0.5,
        maxZoom: 30,
      });

      const sizes = this.panZoomInstance.getSizes();
      let ogRatio = sizes.viewBox.width / sizes.viewBox.height;
      let targetWidth = sizes.height * ogRatio;
      const zoomFactor = targetWidth / sizes.width;
      // this.panZoomInstance.zoom(zoomFactor);
      this.panZoomInstance.center();
      this.panZoomInstance.setMinZoom(zoomFactor);

      //set scrolling boundary
      this.panZoomInstance.setBeforePan((oldPan: any, newPan: { x: number; y: number; }) => {
        const sizes = this.panZoomInstance.getSizes();
        // real content size (in px) after current zoom
        const realW = sizes.viewBox.width * sizes.realZoom;
        const realH = sizes.viewBox.height * sizes.realZoom;

        // container size in px
        const contW = sizes.width;
        const contH = sizes.height;

        // compute the min/max pan.x so the content always overlaps the container
        const minX = Math.min(0, contW - realW);
        const maxX = 0;
        // likewise for pan.y
        const minY = Math.min(0, contH - realH);
        const maxY = 0;

        // clamp
        return {
          x: Math.max(minX, Math.min(newPan.x, maxX)),
          y: Math.max(minY, Math.min(newPan.y, maxY))
        };
      });

      //set onZoom listener
      this.panZoomInstance.setOnZoom((newZoom: number) => {
        const BASE_FONT = 10;       // px at zoom = 1
        const THRESHOLDS = {
          vlarge: 0.5,
          large: 3.0,
          medium: 6.0,
          small: 9.0,
          vsmall: 12.0
        };        // const sw = baseStroke / newZoom;
        // svgEl.querySelectorAll('path').forEach(p => p.setAttribute('stroke-width', `${sw}`));
        const landGroup = svgEl.querySelector('#world-map')!;
        let zoomRatio = zoomFactor / newZoom;
        let newThick = this.worldMapLineBorderThickness * zoomRatio;
        landGroup.setAttribute('stroke-width', `${newThick}px`);
        svgEl.style.setProperty('--hover-stroke', `${newThick}px`);

        //set country label size
        const fontSize = (BASE_FONT * zoomRatio).toFixed(1) + 'px';
        const borderFontSize = (BASE_FONT * zoomRatio / 4).toFixed(1) + 'px';

        // let fontSize = "20px";
        // 2) Decide visibility
        // const opacity = zoomRatio > SHOW_THRESHOLD ? '1' : '0';
        // const opacity  = "1";


        // 2) Compute each category’s opacity
        const op = {
          vlarge: 1 / zoomRatio > THRESHOLDS.vlarge ? '1' : '0',
          large: 1 / zoomRatio > THRESHOLDS.large ? '1' : '0',
          medium: 1/ zoomRatio > THRESHOLDS.medium ? '1' : '0',
          small: 1 / zoomRatio > THRESHOLDS.small ? '1' : '0',
          vsmall: 1 /zoomRatio > THRESHOLDS.vsmall ? '1' : '0'
        };

        // 3) Apply all six vars in one go
        const s = svgEl.style;

        s.setProperty('--opacity-vlarge', op.vlarge);
        s.setProperty('--opacity-large', op.large);
        s.setProperty('--opacity-medium', op.medium);
        s.setProperty('--opacity-small', op.small);
        s.setProperty('--opacity-vsmall', op.vsmall);

        // 3) Apply both in one go
        svgEl.style.setProperty('--label-font', fontSize);
        s.setProperty('--label-font-cover', borderFontSize);

        // svgEl.style.setProperty('--label-opacity', "1");
      });

      this.panZoomInstance.zoom(zoomFactor);


    }).catch(err => {
      console.error('Could not load svg-pan-zoom in browser:', err);
    });
  }

  injectHoverStyles(svgEl: SVGSVGElement) {


    // 🔥 Inject hover style into <style> tag
    //note, we have to add styling here instead of html because SVG object are loaded as a separate doc, isolated from angular
    const style = document.createElementNS(C.SVG_NS, 'style');

    svgEl.style.setProperty('--hover-stroke', '1px');






    style.textContent = `
        :root {
      --label-font:        12px;
      --opacity-vlarge:    0;
      --opacity-large:     0;
      --opacity-medium:    0;
      --opacity-small:     0;
      --opacity-vsmall:    0;
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
      --label-opacity: 1;      /* hidden by default */
    }

    /* hover, land, etc… your existing path rules… */

    /* now label rules reference those vars */
    text.country-label {
      font-family: sans-serif;
      font-size: var(--label-font);
      fill: #000;
      text-anchor: middle;
      dominant-baseline: middle;
      opacity: var(--label-opacity);

      /* */
      stroke: #fff;
      stroke-width: var(--label-font-cover);
      paint-order: stroke fill;
      stroke-linejoin: round;

      pointer-events: none; /* so clicks fall through */
    }

    text.country-label.very-large { opacity: var(--opacity-vlarge); }
    text.country-label.large      { opacity: var(--opacity-large); }
    text.country-label.medium     { opacity: var(--opacity-medium); }
    text.country-label.small      { opacity: var(--opacity-small); }
    text.country-label.very-small { opacity: var(--opacity-vsmall); }
      `;
    svgEl.appendChild(style!);
  }

  setupCountry(p: SVGPathElement, svgEl: SVGSVGElement, labelsGroup: SVGGElement, i: number) {

    p.setAttribute('fill', '#FFD8A9');
    p.setAttribute('stroke', '#ccc');
    // p.setAttribute('stroke-width', '0.5');

    p.setAttribute('stroke', '#000');
    // p.setAttribute('stroke-width', '0.1');
    p.setAttribute('stroke-linejoin', 'round');
    p.setAttribute('stroke-linecap', 'round');

    const area = this.areas[i];
    let cls = 'very-small';
    if (area >= this.quantileArr[3]) cls = 'very-large';
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
      title.textContent = name;
      p.appendChild(title);

      const text = document.createElementNS(C.SVG_NS, 'text');
      text.setAttribute('class', `country-label ${cls}`);
      text.setAttribute('x', cx.toString());
      text.setAttribute('y', cy.toString());
      text.textContent = name;



      // derive label from <title> or fallback to id
      text.textContent = name;

      labelsGroup.appendChild(text);

    }

    p.style.cursor = 'pointer';
    p.addEventListener('click', () => {
      if (!this.panZoomInstance) return;

      // Optional: load country data after zoom
      setTimeout(() => {
        const code = p.id.toUpperCase();
        // this.loadCountryMap(code);
        // this.selectedCountryCode = code;
        this.currentCountryCode = code;
        //add this line because there is issue with isZoomed boolean updated in child component, do detectChange to let parent know about the change in isZoomed
        this.cd.detectChanges();

        this.countryCmp.loadCountryMap(code);


      }, 400); // allow zoom animation before changing
    });
  }

  // backToWorld() {
  //   // this.isZoomed = false;
  //   this.currentCountryCode = "";
  //   this.countrySvg = '';

  //   if (this.panZoomInstanceCountry) {

  //     // Remove zoom listener
  //     if (this.zoomOutHandler) {
  //       this.panZoomInstanceCountry?.setOnZoom(() => { });
  //       // this.zoomOutHandler = null;
  //     }


  //   } else {
  //     this.currentCountryCode = "";
  //   }

  // }

}

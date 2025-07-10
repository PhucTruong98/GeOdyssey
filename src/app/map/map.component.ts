import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import countryData from '../../assets/data/countries.json';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { PlatformService } from '../core/services/platform.service';
import { HttpClient } from '@angular/common/http';
import gsap from 'gsap';


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

  @ViewChild('svgMap', { static: true }) svgMap!: ElementRef<HTMLObjectElement>;

  svgContent: string = "";
  private cachedSvg: string | null = null;

  countryMap: Record<string, string> = {};
  currentCountryCode: string | null = null;
  regions: Region[] = [];
  selectedRegion: Region | null = null;

  selectedCountryCode: string | null = null;
  private panZoomInstance: any;
  private zoomOutHandler: (() => void) | null = null;

  initialZoomLevel: any;
  isLoadingMap = false;
  hasInitializedSvg: any;


  constructor(
    private platform: PlatformService,
    private http: HttpClient

  ) { }

  ngAfterViewInit(): void {
    if (!this.platform.isBrowser) return;

    // 🔥 Register zoom handler here:
    this.zoomOutHandler = () => {
      const currentZoom = this.panZoomInstance!.getZoom();
      if (currentZoom < this.initialZoomLevel * 0.9) {
        this.backToWorld();
      }
    };


    //build lookup map for countries
    (countryData as Country[]).forEach(c => {
      this.countryMap[c.code.toUpperCase()] = c.name;
    });

    this.loadWorldMap();

  }



  loadCountryMap(code: string) {
    if (this.isLoadingMap) return;
    this.isLoadingMap = true;

    this.initialZoomLevel = this.panZoomInstance.getZoom();
    this.currentCountryCode = code;
    this.selectedRegion = null;

    const url = `assets/maps/countries/${code}/${code}.svg`;

    // this.svgMap.nativeElement.data = `assets/maps/countries/${code}/regions.svg`;

    this.http.get(url, { responseType: 'text' }).subscribe(async svg => {
      this.svgContent = svg;
      this.currentCountryCode = code;

          if (this.panZoomInstance) {
        this.panZoomInstance.destroy();
      }

      requestAnimationFrame(() => {
        setTimeout(async () => {
          const svgEl = document.querySelector('.svg-object svg') as SVGSVGElement;
          if (!svgEl) return;


          svgEl?.setAttribute("width", "784.077px");
      svgEl?.setAttribute("height", "458.627px");

//       const viewBox = svgEl?.getAttribute("viewBox"); // e.g., "0 0 800 600"
// if (viewBox) {
//   const [, , w, h] = viewBox.split(" ").map(Number);
//   svgEl?.setAttribute("width", `${w}px`);
//   svgEl?.setAttribute("height", `${h}px`);
// }

          svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');

          const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
          style.textContent = `
        path {
          transition: fill 0.3s ease, stroke 0.3s ease;
        }
        path:hover {
          fill: #388e3c;
          stroke: #fff;
          stroke-width: 1.5;
          filter: drop-shadow(0 0 2px rgba(0,0,0,0.3));
        }
      `;
          svgEl.appendChild(style);

          const regions = svgEl.querySelectorAll('path[id]') as NodeListOf<SVGPathElement>;
          regions.forEach(region => {
            region.style.cursor = 'pointer';
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            region.appendChild(title);

            region.addEventListener('click', () => {
              const regionCode = region.id.toUpperCase();
              this.selectedRegion = this.regions.find(r => r.code === regionCode) || null;
            });
          });

          const { default: svgPanZoom } = await import('svg-pan-zoom');
          this.panZoomInstance = svgPanZoom(svgEl, {
            zoomEnabled: true,
            controlIconsEnabled: true,
 
            minZoom: 0.5,
            maxZoom: 20
          });

          this.initialZoomLevel = this.panZoomInstance.getZoom();

          //add listtener for zooming out event
          this.panZoomInstance.setOnZoom(this.zoomOutHandler);

          this.isLoadingMap = false;
        }, 0);

      });
    });

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
      runInit();
    } else {
      this.http.get('assets/maps/world-map-final5.svg', { responseType: 'text' }).subscribe(svg => {
        this.cachedSvg = svg;
        this.svgContent = svg;
        runInit();
      });
    }


    this.isLoadingMap = false

  }

  initializeSVG() {

    const svgEl = document.querySelector('.svg-object svg') as SVGSVGElement;
    if (!svgEl) return;

    this.setupZoom(svgEl);
    this.injectHoverStyles(svgEl);

    const countries = svgEl.querySelectorAll('path[id]');
    countries.forEach((path) => this.setupCountry(path as SVGPathElement, svgEl));


  }


  setupZoom(svgEl: SVGSVGElement) {

     svgEl?.setAttribute("width", "1000.077px");
      svgEl?.setAttribute("height", "500.627px");
    //have to use this import statement instead of static import up there to avoid window is not define error
    import('svg-pan-zoom').then(({ default: svgPanZoom }) => {
      this.panZoomInstance = svgPanZoom(svgEl, {
        zoomEnabled: true,
        controlIconsEnabled: true,
        fit: true,
        center: true,
        minZoom: 0.5,
        maxZoom: 20
      });
    });
  }

  injectHoverStyles(svgEl: SVGSVGElement) {
    // 🔥 Inject hover style into <style> tag
    //note, we have to add styling here instead of html because SVG object are loaded as a separate doc, isolated from angular
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
        path {
          transition: fill 0.3s ease, stroke 0.3s ease;
        }
        path:hover {
          fill: #1976d2;
          stroke: #fff;
          stroke-width: 1.5;
          filter: drop-shadow(0 0 2px rgba(0,0,0,0.3));
        }
      `;
    svgEl.appendChild(style!);
  }

  setupCountry(p: SVGPathElement, svgEl: SVGSVGElement) {

    const code = p.id?.toUpperCase();
    const name = this.countryMap[code];

    if (name) {
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = name;
      p.appendChild(title);
    }

    p.style.cursor = 'pointer';
    p.addEventListener('click', () => {
      if (!this.panZoomInstance) return;

      const bbox = p.getBBox();
      const centerX = bbox.x + bbox.width / 2;
      const centerY = bbox.y + bbox.height / 2;
      const svgRect = this.svgMap.nativeElement.getBoundingClientRect();

      const zoomLevel = Math.min(10, 300 / bbox.width);

      const pan = {
        x: -centerX * zoomLevel + svgRect.width / 2,
        y: -centerY * zoomLevel + svgRect.height / 2
      };

      this.smoothZoomAndPanToWithGSAP(zoomLevel, pan);

      // Optional: load country data after zoom
      setTimeout(() => {
        const code = p.id.toUpperCase();
        this.loadCountryMap(code);
        this.selectedCountryCode = code;

      }, 400); // allow zoom animation before changing



    });
  }




  closeDetail() {
    this.selectedCountryCode = null;
  }


  smoothZoomAndPanToWithGSAP(targetZoom: number, targetPan: { x: number; y: number }) {
    if (!this.panZoomInstance) return;

    const currentZoom = this.panZoomInstance.getZoom();
    const currentPan = this.panZoomInstance.getPan();

    const panZoom = this.panZoomInstance; // ✅ capture instance locally

    gsap.to({ zoom: currentZoom, x: currentPan.x, y: currentPan.y }, {
      zoom: targetZoom,
      x: targetPan.x,
      y: targetPan.y,
      duration: 0.6,
      ease: 'power2.inOut',
      onUpdate: function () {
        const state = this['targets']()[0]; // internal gsap target
        panZoom.zoom(state.zoom);
        panZoom.pan({ x: state.x, y: state.y });
      }
    });
  }

  backToWorld() {
    if (this.panZoomInstance) {

        // Remove zoom listener
  if (this.zoomOutHandler) {
    this.panZoomInstance?.setOnZoom(() => {});
    // this.zoomOutHandler = null;
  }

      const currentZoom = this.panZoomInstance.getZoom();
      const currentPan = this.panZoomInstance.getPan();

      const targetZoom = 1;
      const targetPan = { x: 0, y: 0 };
      const panZoom = this.panZoomInstance; // ✅ capture for scope safety

      gsap.to({ zoom: currentZoom, x: currentPan.x, y: currentPan.y }, {
        zoom: targetZoom,
        x: targetPan.x,
        y: targetPan.y,
        duration: 0.5,
        ease: 'power2.inOut',
        onUpdate: function () {
          const state = this['targets']()[0];
          panZoom.zoom(state.zoom);
          panZoom.pan({ x: state.x, y: state.y });
        },
        onComplete: () => {
          this.currentCountryCode = null;
          this.loadWorldMap();
        }
      });
    } else {
      this.currentCountryCode = null;
      this.loadWorldMap();
    }

  }

}
